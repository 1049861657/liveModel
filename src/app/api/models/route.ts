import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// 有效的排序选项
const VALID_SORT_OPTIONS = ['newest', 'oldest', 'name', 'favorites']
// 有效的格式选项
const VALID_FORMAT_OPTIONS = ['dae', 'glb', 'gltf', 'obj']
// 有效的所有者过滤选项
const VALID_OWNER_OPTIONS = ['mine', 'all']
// 默认分页限制
const DEFAULT_PAGE_LIMIT = 9

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    
    // 参数提取与验证
    const showFavorites = searchParams.get('favorites') === 'true'
    
    // 格式验证
    const format = searchParams.get('format')
    if (format && !VALID_FORMAT_OPTIONS.includes(format)) {
      return NextResponse.json(
        { error: `无效的格式参数: ${format}. 支持的格式: ${VALID_FORMAT_OPTIONS.join(', ')}` },
        { status: 400 }
      )
    }
    
    // 所有者参数验证
    const owner = searchParams.get('owner')
    if (owner && !VALID_OWNER_OPTIONS.includes(owner)) {
      return NextResponse.json(
        { error: `无效的所有者参数: ${owner}. 支持的选项: ${VALID_OWNER_OPTIONS.join(', ')}` },
        { status: 400 }
      )
    }
    
    const search = searchParams.get('search')
    
    // 排序参数验证
    const sort = searchParams.get('sort') || 'newest'
    if (!VALID_SORT_OPTIONS.includes(sort)) {
      return NextResponse.json(
        { error: `无效的排序参数: ${sort}. 支持的选项: ${VALID_SORT_OPTIONS.join(', ')}` },
        { status: 400 }
      )
    }
    
    // 分页参数处理与验证
    const pageStr = searchParams.get('page')
    const page = pageStr ? parseInt(pageStr, 10) : 1
    if (isNaN(page) || page < 1) {
      return NextResponse.json(
        { error: '页码必须是大于0的数字' },
        { status: 400 }
      )
    }
    
    const limitStr = searchParams.get('limit')
    const limit = limitStr ? parseInt(limitStr, 10) : DEFAULT_PAGE_LIMIT
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: '每页数量必须是1到100之间的数字' },
        { status: 400 }
      )
    }
    
    // 获取用户会话
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
    
    // 处理未登录用户请求个人数据的情况
    if (owner === 'mine' && !userId) {
      return NextResponse.json({
        models: [],
        total: 0,
        pages: 0,
        message: '需要登录才能查看个人模型'
      })
    }
    
    // 构建查询条件
    const where: any = {}
    
    // 格式过滤
    if (format) {
      where.format = format
    }

    // 搜索过滤
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } }
      ]
    }

    // 所有权和可见性过滤
    if (owner === 'mine' && userId) {
      where.userId = userId
    } else if (userId) {
      // 非 mine 模式下显示公开的和自己的
      if (!where.OR) {
        where.OR = []
      } else {
        // 如果已经有搜索的 OR 条件，需要将其包装在 AND 中
        where.AND = [{
          OR: where.OR
        }]
        delete where.OR
      }
      where[where.AND ? 'AND' : 'OR'].push({
        OR: [
          { isPublic: true },
          { userId: userId }
        ]
      })
    } else {
      where.isPublic = true
    }

    // 收藏过滤
    if (showFavorites) {
      if (userId) {
        where.favorites = {
          some: {
            userId: userId
          }
        }
      } else {
        // 未登录用户请求收藏内容
        return NextResponse.json({
          models: [],
          total: 0,
          pages: 0,
          message: '需要登录才能查看收藏模型'
        })
      }
    }

    // 构建排序条件
    let orderBy: any = {}
    switch (sort) {
      case 'oldest':
        orderBy = { createdAt: 'asc' }
        break
      case 'name':
        orderBy = { name: 'asc' }
        break
      case 'favorites':
        orderBy = { favorites: { _count: 'desc' } }
        break
      default: // newest
        orderBy = { createdAt: 'desc' }
    }

    // 使用事务执行查询以确保数据一致性
    const [models, total] = await prisma.$transaction([
      // 获取分页数据
      prisma.model.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: {
                select: {
                  url: true
                }
              }
            }
          },
          _count: {
            select: {
              favorites: true,
              reviews: true
            }
          },
          ...(userId ? {
            favorites: {
              where: { userId: userId },
              select: { id: true }
            }
          } : {})
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit
      }),
      // 获取总数
      prisma.model.count({ where })
    ])

    // 处理返回数据
    const processedModels = models.map(model => {
      // 解构避免返回不必要的favorites数组
      const { favorites, ...rest } = model
      return {
        ...rest,
        isFavorited: userId ? favorites?.length > 0 : false,
        _count: {
          ...model._count,
          favorites: model._count?.favorites || 0,
          reviews: model._count?.reviews || 0
        }
      }
    })

    return NextResponse.json({
      models: processedModels,
      total,
      pages: Math.ceil(total / limit)
    })
  } catch (error) {
    console.error('获取模型列表失败:', error)
    return NextResponse.json(
      { error: '获取模型列表失败', details: process.env.NODE_ENV === 'development' ? String(error) : undefined },
      { status: 500 }
    )
  }
} 