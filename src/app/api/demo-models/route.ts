import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const demoModels = await prisma.demoModel.findMany({
      where: {
        isEnabled: true
      },
      orderBy: {
        order: 'asc'
      },
      select: {
        id: true,
        name: true
      }
    })

    return NextResponse.json(demoModels)
  } catch (error) {
    console.error('Failed to fetch demo models:', error)
    // 返回默认模型列表作为后备
    return NextResponse.json([
      { id: 'shiba', name: '柴犬' },
      { id: 'model-with-animations', name: '带动画模型' }
    ])
  }
} 