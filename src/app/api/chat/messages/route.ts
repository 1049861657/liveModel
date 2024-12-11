import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth'

// 获取最近1小时的消息
export async function GET() {
  try {
    const messages = await prisma.chatMessage.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 3600000) // 1小时前
        }
      },
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
      orderBy: {
        createdAt: 'desc'
      },
      take: 50
    })

    return NextResponse.json({ messages: messages.reverse() })
  } catch (error) {
    console.error('获取消息失败:', error)
    return NextResponse.json(
      { error: '获取消息失败' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// 发送新消息
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { content, type = 'text' } = body

    if (!content?.trim()) {
      return NextResponse.json(
        { error: '消息内容不能为空' },
        { status: 400 }
      )
    }

    const message = await prisma.chatMessage.create({
      data: {
        content,
        type,
        userId: session.user.id
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        }
      }
    })

    return NextResponse.json(message)
  } catch (error) {
    console.error('发送消息失败:', error)
    return NextResponse.json(
      { error: '发送失败' },
      { status: 500 }
    )
  }
} 