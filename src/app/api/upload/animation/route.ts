import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { storageClient } from '@/lib/oss'

export const runtime = 'nodejs'
export const maxDuration = 60

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
    const file = formData.get('animation') as File
    const modelId = formData.get('modelId') as string
    const name = formData.get('name') as string

    if (!file || !modelId || !name) {
      return NextResponse.json(
        { error: '缺少必要的字段' },
        { status: 400 }
      )
    }

    // 验证文件大小
    const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: '文件大小超过限制' },
        { status: 400 }
      )
    }

    // 验证文件扩展名
    if (!file.name.endsWith('.smd')) {
      return NextResponse.json(
        { error: '仅支持 .smd 格式' },
        { status: 400 }
      )
    }

    // 验证模型存在且属于当前用户
    const model = await prisma.model.findFirst({
      where: {
        id: modelId,
        userId: session.user.id,
        format: 'dae'
      }
    })

    if (!model) {
      return NextResponse.json(
        { error: '模型不存在或无权限' },
        { status: 404 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // 生成文件名和OSS路径
    const timestamp = Date.now()
    const filename = `${name}_${timestamp}.smd`
    const ossPath = `models/${model.format}/${model.componentName}/animations/${filename}`
    
    // 上传到存储服务
    const result = await storageClient.put(ossPath, buffer)

    // 保存到数据库
    const animation = await prisma.animation.create({
      data: {
        name,
        filePath: result.url,
        fileSize: file.size,
        modelId: model.id
      }
    })

    return NextResponse.json({
      success: true,
      animation
    })
  } catch (error) {
    console.error('上传动画失败:', error)
    return NextResponse.json(
      { error: '上传失败' },
      { status: 500 }
    )
  }
} 