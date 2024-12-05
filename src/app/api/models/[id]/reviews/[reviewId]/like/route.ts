import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth'

export async function POST(
  request: Request,
  { params }: { params: { id: string; reviewId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      )
    }

    // 检查是否已经点赞
    const existingLike = await prisma.reviewLike.findUnique({
      where: {
        userId_reviewId: {
          userId: session.user.id,
          reviewId: params.reviewId
        }
      }
    })

    if (existingLike) {
      // 取消点赞
      await prisma.$transaction([
        prisma.reviewLike.delete({
          where: {
            userId_reviewId: {
              userId: session.user.id,
              reviewId: params.reviewId
            }
          }
        }),
        prisma.review.update({
          where: { id: params.reviewId },
          data: { likes: { decrement: 1 } }
        })
      ])

      return NextResponse.json({ message: '已取消点赞' })
    } else {
      // 添加点赞
      await prisma.$transaction([
        prisma.reviewLike.create({
          data: {
            userId: session.user.id,
            reviewId: params.reviewId
          }
        }),
        prisma.review.update({
          where: { id: params.reviewId },
          data: { likes: { increment: 1 } }
        })
      ])

      return NextResponse.json({ message: '点赞成功' })
    }
  } catch (error) {
    console.error('点赞操作失败:', error)
    return NextResponse.json(
      { error: '操作失败，请稍后重试' },
      { status: 500 }
    )
  }
} 