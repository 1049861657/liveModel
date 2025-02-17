import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth'

export async function DELETE(
  _request: Request,
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

    // 检查评论是否存在且属于当前用户
    const review = await prisma.review.findUnique({
      where: { id: params.reviewId }
    })

    if (!review) {
      return NextResponse.json(
        { error: '评论不存在' },
        { status: 404 }
      )
    }

    if (review.userId !== session.user.id) {
      return NextResponse.json(
        { error: '无权删除此评论' },
        { status: 403 }
      )
    }

    // 使用事务删除评论及更新模型评分
    await prisma.$transaction(async (tx) => {
      // 删除评论
      await tx.review.delete({
        where: { id: params.reviewId }
      })

      // 重新计算平均分
      const reviews = await tx.review.findMany({
        where: { modelId: params.id },
        select: { rating: true }
      })

      const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0)
      const newAvgRating = reviews.length ? totalRating / reviews.length : 0

      // 更新模型统计
      await tx.model.update({
        where: { id: params.id },
        data: {
          totalReviews: { decrement: 1 },
          avgRating: newAvgRating
        }
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('删除评论失败:', error)
    return NextResponse.json(
      { error: '删除失败' },
      { status: 500 }
    )
  }
} 