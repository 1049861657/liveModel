import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// 获取聊天消息
export async function GET() {
  try {
    const messages = await prisma.chatMessage.findMany({
      take: 50, // 限制返回最近50条消息
      orderBy: {
        createdAt: 'asc'
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

    return NextResponse.json(messages)
  } catch (error) {
    console.error('获取聊天消息失败:', error)
    return NextResponse.json(
      { error: '获取聊天消息失败' },
      { status: 500 }
    )
  }
}

// 发送聊天消息
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      )
    }

    const { content, type = 'text' } = await request.json()

    if (!content) {
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
      { error: '发送消息失败' },
      { status: 500 }
    )
  }
} 