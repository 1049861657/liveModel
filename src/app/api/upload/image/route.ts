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
    const file = formData.get('file') as File
    const type = formData.get('type') as string || 'chat'
    
    if (!file) {
      return NextResponse.json(
        { error: '请选择图片文件' },
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

    // 验证文件大小 (5MB)
    const MAX_FILE_SIZE = 5 * 1024 * 1024
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: '图片大小不能超过5MB' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // 生成OSS路径
    const timestamp = Date.now()
    const ext = file.name.split('.').pop()
    const ossPath = `images/${type}/${session.user.id}/${timestamp}.${ext}`

    // 上传到存储服务
    const result = await storageClient.put(ossPath, buffer)

    // 创建图片记录
    const image = await prisma.image.create({
      data: {
        name: file.name,
        url: result.url,
        size: file.size,
        type: type,
        userId: session.user.id
      }
    })

    return NextResponse.json(image)
  } catch (error) {
    console.error('上传图片失败:', error)
    return NextResponse.json(
      { error: '上传失败' },
      { status: 500 }
    )
  }
} 