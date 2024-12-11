import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth'

// 获取模型的评价列表
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const sort = searchParams.get('sort') || 'latest'
    const skip = (page - 1) * limit

    // 根据排序类型设置排序条件
    let orderBy: any = { createdAt: 'desc' }
    switch (sort) {
      case 'rating':
        orderBy = { rating: 'desc' }
        break
      case 'likes':
        orderBy = { likes: 'desc' }
        break
      // 默认按最新排序
      default:
        orderBy = { createdAt: 'desc' }
    }

    const [reviews, total] = await prisma.$transaction([
      prisma.review.findMany({
        where: { modelId: params.id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true
            }
          },
          replies: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true
                }
              }
            },
            orderBy: { createdAt: 'asc' }
          },
          _count: {
            select: { likedBy: true }
          }
        },
        orderBy,
        skip,
        take: limit
      }),
      prisma.review.count({
        where: { modelId: params.id }
      })
    ])

    // 获取当前用户的点赞状态
    const session = await getServerSession(authOptions)
    let userLikes: string[] = []
    
    if (session) {
      const likes = await prisma.reviewLike.findMany({
        where: {
          userId: session.user.id,
          reviewId: { in: reviews.map(r => r.id) }
        }
      })
      userLikes = likes.map(like => like.reviewId)
    }

    return NextResponse.json({
      reviews: reviews.map(review => ({
        ...review,
        isLiked: userLikes.includes(review.id)
      })),
      total,
      pages: Math.ceil(total / limit)
    })
  } catch (error) {
    console.error('获取评价失败:', error)
    return NextResponse.json(
      { error: '获取评价失败' },
      { status: 500 }
    )
  }
}

// 发表评价
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

    const body = await request.json()
    const { content, rating } = body

    if (!content || !rating) {
      return NextResponse.json(
        { error: '评价内容和评分不能为空' },
        { status: 400 }
      )
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: '评分必须在1-5之间' },
        { status: 400 }
      )
    }

    // 先计算新的平均分
    const reviews = await prisma.review.findMany({
      where: { modelId: params.id },
      select: { rating: true }
    })
    
    // 计算包含新评价的平均分
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0) + rating
    const newAvgRating = totalRating / (reviews.length + 1)

    // 使用事务更新评价和模型评分
    const [review] = await prisma.$transaction([
      // 创建评价
      prisma.review.create({
        data: {
          content,
          rating,
          userId: session.user.id,
          modelId: params.id
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true
            }
          },
          replies: true,
          _count: {
            select: {
              likedBy: true
            }
          }
        }
      }),
      // 更新模型的评分统计
      prisma.model.update({
        where: { id: params.id },
        data: {
          totalReviews: { increment: 1 },
          avgRating: newAvgRating
        }
      })
    ])

    return NextResponse.json(review)
  } catch (error) {
    console.error('发表评价失败:', error)
    return NextResponse.json(
      { error: '发表评价失败' },
      { status: 500 }
    )
  }
} 