import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      )
    }

    const recentModels = await prisma.model.findMany({
      where: {
        userId: session.user.id
      },
      orderBy: {
        createdAt: 'desc'
      },
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
        favorites: {
          where: { userId: session.user.id },
          select: { id: true }
        }
      }
    })

    // 处理返回的模型数据
    const processedModels = recentModels.map(model => {
      // 解构避免返回不必要的favorites数组
      const { favorites, ...rest } = model;
      return {
        ...rest,
        isFavorited: favorites?.length > 0,
        _count: {
          favorites: model._count?.favorites || 0,
          reviews: model._count?.reviews || 0
        }
      }
    })

    return NextResponse.json(processedModels)
  } catch (error) {
    console.error('获取最近上传失败:', error)
    return NextResponse.json(
      { error: '获取最近上传失败' },
      { status: 500 }
    )
  }
} 