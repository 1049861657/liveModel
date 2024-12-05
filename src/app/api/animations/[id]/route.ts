import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { unlink } from 'fs/promises'
import path from 'path'

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // 1. 获取动画信息
    const animation = await prisma.animation.findUnique({
      where: { id: params.id }
    })

    if (!animation) {
      return NextResponse.json(
        { error: '动画不存在' },
        { status: 404 }
      )
    }

    // 2. 删除文件
    const filePath = path.join(process.cwd(), 'public', animation.filePath)
    try {
      await unlink(filePath)
    } catch (error) {
      console.error('删除文件失败:', error)
      // 继续执行数据库删除操作
    }

    // 3. 删除数据库记录
    await prisma.animation.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('删除动画失败:', error)
    return NextResponse.json(
      { error: '删除动画失败' },
      { status: 500 }
    )
  }
} 