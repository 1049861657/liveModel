import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { storageClient } from '@/lib/oss'
import JSZip from 'jszip'
import type { ListResult } from '@/lib/storage/types'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5分钟超时

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    // 获取模型信息
    const model = await prisma.model.findUnique({
      where: { id: params.id },
      include: {
        animations: true
      }
    })

    if (!model) {
      return NextResponse.json(
        { error: '模型不存在' },
        { status: 404 }
      )
    }

    if (!model.componentName) {
      return NextResponse.json(
        { error: '模型数据不完整' },
        { status: 500 }
      )
    }

    // 检查权限（如果模型不是公开的，需要验证用户权限）
    if (!model.isPublic && (!session || model.userId !== session.user.id)) {
      return NextResponse.json(
        { error: '无权限下载此模型' },
        { status: 403 }
      )
    }

    // 创建 ZIP 文件
    const zip = new JSZip()
    const modelFolder = zip.folder(model.componentName)
    if (!modelFolder) throw new Error('Failed to create zip folder')

    // 获取模型文件夹的路径前缀
    const folderPrefix = `models/${model.format}/${model.componentName}/`

    // 列出文件夹中的所有文件
    let result: ListResult
    try {
      result = await storageClient.list({
        prefix: folderPrefix,
        'max-keys': 1000
      })
    } catch (error) {
      console.error('列出文件失败:', error)
      throw new Error('Failed to list files')
    }

    if (!result.objects || result.objects.length === 0) {
      throw new Error('No files found in the model folder')
    }

    // 下载所有文件并添加到 ZIP
    const downloadPromises = result.objects.map(async (obj) => {
      const fileData = await storageClient.get(obj.name)
      const relativePath = obj.name.replace(folderPrefix, '')
      modelFolder.file(relativePath, fileData.content)
    })

    await Promise.all(downloadPromises)

    // 生成 ZIP 文件
    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 6
      }
    })

    // 设置响应头
    const headers = new Headers()
    headers.set('Content-Type', 'application/zip')
    headers.set(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(model.componentName)}.zip`
    )

    return new NextResponse(zipBuffer, {
      status: 200,
      headers
    })

  } catch (error) {
    console.error('下载模型失败:', error)
    return NextResponse.json(
      { error: '下载失败' },
      { status: 500 }
    )
  }
} 