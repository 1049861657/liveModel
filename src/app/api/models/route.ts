import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const showFavorites = searchParams.get('favorites') === 'true'
    const format = searchParams.get('format')
    const own = searchParams.get('own') === 'true'
    const session = await getServerSession(authOptions)
    
    // 构建查询条件
    const where: any = {}
    
    // 格式过滤
    if (format) {
      where.format = format
    }

    // 所有权过滤
    if (own && session?.user?.id) {
      where.userId = session.user.id
    } else if (session?.user?.id) {
      // 非 own 模式下显示公开的和自己的
      where.OR = [
        { isPublic: true },
        { userId: session.user.id }
      ]
    } else {
      // 未登录只显示公开的
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

    const models = await prisma.model.findMany({
      where,
      include: {
        user: {
          select: {
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
      orderBy: {
        createdAt: 'desc'
      }
    })

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

    return NextResponse.json(processedModels)
  } catch (error) {
    console.error('获取模型列表失败:', error)
    return NextResponse.json(
      { error: '获取模型列表失败' },
      { status: 500 }
    )
  }
} 