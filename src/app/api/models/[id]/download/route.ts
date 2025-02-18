import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { storageClient } from '@/lib/oss'
import type { ListResult } from '@/lib/storage/types'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5分钟超时

export async function GET(
  _request: Request,
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

    // 生成预签名URL
    const files = await Promise.all(
      result.objects.map(async (obj) => {
        const url = await storageClient.getSignedUrl(obj.name, 3600) // 1小时有效期
        return {
          name: obj.name.replace(folderPrefix, ''),
          url,
          size: obj.size
        }
      })
    )

    // 返回文件列表和模型信息
    return NextResponse.json({
      files,
      model: {
        name: model.componentName,
        format: model.format
      }
    })
  } catch (error) {
    console.error('获取下载信息失败:', error)
    return NextResponse.json(
      { error: '获取下载信息失败' },
      { status: 500 }
    )
  }
} 