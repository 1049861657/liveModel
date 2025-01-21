import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const showFavorites = searchParams.get('favorites') === 'true'
    const format = searchParams.get('format')
    const owner = searchParams.get('owner')
    const search = searchParams.get('search')
    const sort = searchParams.get('sort') || 'newest'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '9')
    const session = await getServerSession(authOptions)
    
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
    if (owner === 'mine' && session?.user?.id) {
      where.userId = session.user.id
    } else if (session?.user?.id) {
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
          { userId: session.user.id }
        ]
      })
    } else {
      where.isPublic = true
    }

    // 收藏过滤
    if (showFavorites && session?.user?.id) {
      where.favorites = {
        some: {
          userId: session.user.id
        }
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
          ...(session?.user?.id ? {
            favorites: {
              where: { userId: session.user.id },
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
      const { favorites, ...rest } = model
      return {
        ...rest,
        isFavorited: session?.user?.id ? favorites?.length > 0 : false,
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
      { error: '获取模型列表失败' },
      { status: 500 }
    )
  }
} 