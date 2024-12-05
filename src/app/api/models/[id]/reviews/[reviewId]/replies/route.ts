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

    const { content } = await request.json()

    if (!content?.trim()) {
      return NextResponse.json(
        { error: '回复内容不能为空' },
        { status: 400 }
      )
    }

    // 创建回复
    const reply = await prisma.reply.create({
      data: {
        content,
        userId: session.user.id,
        reviewId: params.reviewId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json(reply)
  } catch (error) {
    console.error('发表回复失败:', error)
    return NextResponse.json(
      { error: '发表回复失败，请稍后重试' },
      { status: 500 }
    )
  }
} 