import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// 添加或取消收藏
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      )
    }

    const model = await prisma.model.findUnique({
      where: { id: params.id }
    })

    if (!model) {
      return NextResponse.json(
        { error: '模型不存在' },
        { status: 404 }
      )
    }

    // 查找是否已收藏
    const existingFavorite = await prisma.favorite.findUnique({
      where: {
        userId_modelId: {
          userId: session.user.id,
          modelId: params.id
        }
      }
    })

    let isFavorited: boolean
    if (existingFavorite) {
      // 取消收藏
      await prisma.favorite.delete({
        where: { id: existingFavorite.id }
      })
      isFavorited = false
    } else {
      // 添加收藏
      await prisma.favorite.create({
        data: {
          userId: session.user.id,
          modelId: params.id
        }
      })
      isFavorited = true
    }

    // 获取最新的收藏数
    const updatedModel = await prisma.model.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            favorites: true
          }
        }
      }
    })

    return NextResponse.json({
      isFavorited,
      favoriteCount: updatedModel?._count.favorites || 0
    })
  } catch (error) {
    console.error('收藏操作失败:', error)
    return NextResponse.json(
      { error: '操作失败' },
      { status: 500 }
    )
  }
}

// 获取收藏状态
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ isFavorited: false })
    }

    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_modelId: {
          userId: session.user.id,
          modelId: params.id
        }
      }
    })

    return NextResponse.json({ isFavorited: !!favorite })
  } catch (error) {
    console.error('获取收藏状态失败:', error)
    return NextResponse.json(
      { error: '获取状态失败' },
      { status: 500 }
    )
  }
} 