import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ossClient } from '@/lib/oss'

export async function POST(request: Request) {
  try {
    // 验证用户登录
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      )
    }

    console.log('开始处理上传请求')
    const formData = await request.formData()
    const file = formData.get('file') as File
    const name = formData.get('name') as string || file.name
    const description = formData.get('description') as string || null
    
    if (!file) {
      console.error('没有文件被上传')
      return NextResponse.json(
        { error: '没有文件' },
        { status: 400 }
      )
    }

    console.log('文件信息:', {
      name: file.name,
      size: file.size,
      type: file.type
    })

    // 生成OSS存储路径
    const ext = file.name.split('.').pop()
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const ossPath = `test-models/${filename}`

    console.log('准备上传到OSS路径:', ossPath)

    // 将File对象转换为Buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // 上传到OSS
    console.log('开始上传到OSS...')
    const result = await ossClient.put(ossPath, buffer)
    console.log('OSS上传成功:', result)

    // 保存到数据库
    const model = await prisma.model.create({
      data: {
        name,
        description,
        filePath: result.url,
        fileSize: file.size,
        format: ext || '',
        componentName: filename,
        userId: session.user.id,
        isPublic: true
      }
    })

    return NextResponse.json({
      success: true,
      url: result.url,
      path: ossPath,
      model
    })

  } catch (error) {
    console.error('上传失败，详细错误:', error)
    // 检查是否是OSS错误
    if (error instanceof Error) {
      return NextResponse.json(
        { 
          error: '上传失败',
          message: error.message,
          details: error.stack
        },
        { status: 500 }
      )
    }
    return NextResponse.json(
      { error: '上传失败' },
      { status: 500 }
    )
  }
} 