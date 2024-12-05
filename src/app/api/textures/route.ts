import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const modelId = formData.get('modelId') as string
    const files = formData.getAll('files') as File[]

    if (!modelId) {
      return NextResponse.json(
        { error: '缺少模型ID' },
        { status: 400 }
      )
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: '没有选择贴图文件' },
        { status: 400 }
      )
    }

    // 确保目录存在
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'models', 'dae', modelId)
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // 保存所有贴图文件
    const savedFiles = await Promise.all(
      files.map(async (file) => {
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const fileName = file.name
        const filePath = join(uploadDir, fileName)
        
        await writeFile(filePath, buffer)
        return fileName
      })
    )

    return NextResponse.json({
      success: true,
      message: '贴图上传成功',
      files: savedFiles
    })

  } catch (error) {
    console.error('贴图上传错误:', error)
    return NextResponse.json(
      { error: '贴图上传失败' },
      { status: 500 }
    )
  }
} 