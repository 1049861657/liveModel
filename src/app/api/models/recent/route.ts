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
      select: {
        id: true,
        name: true,
        isPublic: true,
        createdAt: true,
        filePath: true,
        format: true,
        userId: true
      }
    })

    return NextResponse.json(recentModels)
  } catch (error) {
    console.error('获取最近上传失败:', error)
    return NextResponse.json(
      { error: '获取最近上传失败' },
      { status: 500 }
    )
  }
} 