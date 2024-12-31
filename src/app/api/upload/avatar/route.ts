import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { storageClient } from '@/lib/oss'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('avatar') as File
    
    if (!file) {
      return NextResponse.json(
        { error: '请选择头像图片' },
        { status: 400 }
      )
    }

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: '只能上传图片文件' },
        { status: 400 }
      )
    }

    // 验证文件大小 (2MB)
    const MAX_FILE_SIZE = 2 * 1024 * 1024
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: '图片大小不能超过2MB' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // 生成OSS路径
    const timestamp = Date.now()
    const ext = file.name.split('.').pop()
    const ossPath = `images/avatars/${session.user.id}/${timestamp}.${ext}`

    // 上传到存储服务
    const result = await storageClient.put(ossPath, buffer)

    // 使用事务处理数据库操作
    const [oldImage, newImage] = await prisma.$transaction(async (tx) => {
      // 1. 获取用户当前头像ID
      const user = await tx.user.findUnique({
        where: { id: session.user.id },
        select: { avatarId: true }
      })

      // 2. 如果存在旧头像记录，获取它的信息
      let oldImage = null
      if (user?.avatarId) {
        oldImage = await tx.image.findUnique({
          where: { id: user.avatarId }
        })
      }

      // 3. 创建新的图片记录
      const newImage = await tx.image.create({
        data: {
          name: file.name,
          url: result.url,
          size: file.size,
          type: 'avatar',
          userId: session.user.id
        }
      })

      // 4. 更新用户的头像ID
      await tx.user.update({
        where: { id: session.user.id },
        data: { avatarId: newImage.id }
      })

      // 5. 如果存在旧头像记录，删除它
      if (oldImage) {
        await tx.image.delete({
          where: { id: oldImage.id }
        })
      }

      return [oldImage, newImage]
    })

    // 如果存在旧头像，从存储服务中删除
    if (oldImage) {
      try {
        // 从URL中提取OSS路径
        const oldPath = new URL(oldImage.url).pathname.slice(1)
        await storageClient.delete(oldPath)
      } catch (error) {
        console.error('删除旧头像失败:', error)
      }
    }

    return NextResponse.json({
      success: true,
      avatar: newImage
    })
  } catch (error) {
    console.error('上传头像失败:', error)
    return NextResponse.json(
      { error: '上传失败' },
      { status: 500 }
    )
  }
} 