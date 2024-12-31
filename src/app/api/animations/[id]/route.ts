import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import path from 'path'
import { storageClient } from '@/lib/oss'

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // 1. 获取动画信息
    const animation = await prisma.animation.findUnique({
      where: { id: params.id },
      include: {
        model: true // 需要获取模型信息以构造正确的OSS路径
      }
    })

    if (!animation) {
      return NextResponse.json(
        { error: '动画不存在' },
        { status: 404 }
      )
    }

    // 2. 删除OSS文件
    try {
      const animationOssKey = `models/${animation.model.format}/${animation.model.componentName}/animations/${path.basename(animation.filePath)}`
      await storageClient.delete(animationOssKey)
    } catch (error) {
      console.error('删除OSS文件失败:', error)
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