import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const modelId = params.id

    // 从数据库获取模型的动画列表
    const animations = await prisma.animation.findMany({
      where: {
        modelId: modelId
      },
      select: {
        id: true,
        name: true,
        filePath: true
      }
    })

    return NextResponse.json(animations)
  } catch (error) {
    console.error('Error fetching animations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch animations' },
      { status: 500 }
    )
  }
} 