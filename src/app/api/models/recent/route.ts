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
            favorites: true
          }
        }
      }
    })

    const userFavorites = await prisma.favorite.findMany({
      where: {
        userId: session.user.id
      },
      select: {
        modelId: true
      }
    })

    const userFavoriteIds = new Set(userFavorites.map(f => f.modelId))

    const processedModels = recentModels.map(model => ({
      ...model,
      isFavorited: userFavoriteIds.has(model.id)
    }))

    return NextResponse.json(processedModels)
  } catch (error) {
    console.error('获取最近上传失败:', error)
    return NextResponse.json(
      { error: '获取最近上传失败' },
      { status: 500 }
    )
  }
} 