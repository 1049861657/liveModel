import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth'

export async function DELETE(
  _request: Request,
  { params }: { params: { replyId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      )
    }

    // 检查回复是否存在且属于当前用户
    const reply = await prisma.reply.findUnique({
      where: { id: params.replyId }
    })

    if (!reply) {
      return NextResponse.json(
        { error: '回复不存在' },
        { status: 404 }
      )
    }

    if (reply.userId !== session.user.id) {
      return NextResponse.json(
        { error: '无权删除此回复' },
        { status: 403 }
      )
    }

    // 删除回复
    await prisma.reply.delete({
      where: { id: params.replyId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('删除回复失败:', error)
    return NextResponse.json(
      { error: '删除失败' },
      { status: 500 }
    )
  }
} 