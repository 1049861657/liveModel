import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import path from 'path'
import { storageClient } from '@/lib/oss'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // 验证用户身份
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      )
    }

    // 1. 获取动画信息
    const animation = await prisma.animation.findUnique({
      where: { id: params.id },
      include: {
        model: {
          select: {
            id: true,
            userId: true,
            format: true,
            componentName: true
          }
        }
      }
    })

    if (!animation) {
      return NextResponse.json(
        { error: '动画不存在' },
        { status: 404 }
      )
    }

    // 验证权限
    if (!animation.model || animation.model.userId !== session.user.id) {
      return NextResponse.json(
        { error: '无权限删除此动画' },
        { status: 403 }
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