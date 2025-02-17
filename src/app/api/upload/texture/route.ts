import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'
import path from 'path'
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
    const modelId = formData.get('modelId') as string

    if (!modelId) {
      return NextResponse.json(
        { error: '缺少模型ID' },
        { status: 400 }
      )
    }

    // 获取模型信息
    const model = await prisma.model.findUnique({
      where: { id: modelId }
    })

    if (!model) {
      return NextResponse.json(
        { error: '模型不存在' },
        { status: 404 }
      )
    }

    // 检查权限
    if (model.userId !== session.user.id) {
      return NextResponse.json(
        { error: '无权限上传贴图' },
        { status: 403 }
      )
    }

    // 收集所有贴图文件
    const textureFiles: FormDataEntryValue[] = []
    formData.forEach((value, key) => {
      if (key.startsWith('texture_')) {
        textureFiles.push(value)
      }
    })

    if (textureFiles.length === 0) {
      return NextResponse.json(
        { error: '没有找到贴图文件' },
        { status: 400 }
      )
    }

    // 计算贴图总大小
    let totalTextureSize = 0

    // 保存贴图文件并记录信息
    const texturePromises = textureFiles.map(async (textureFile) => {
      if (textureFile instanceof Blob) {
        const textureBuffer = Buffer.from(await textureFile.arrayBuffer())
        const textureName = 'name' in textureFile ? textureFile.name : `texture_${Date.now()}`
        const textureFilename = `${Date.now()}_${textureName}`
        const textureOssPath = `models/${model.format}/${model.componentName}/textures/${textureFilename}`
        
        // 上传贴图到存储服务
        const textureResult = await storageClient.put(textureOssPath, textureBuffer)
        
        totalTextureSize += textureFile.size

        return {
          name: textureName,
          filePath: textureResult.url,
          fileSize: textureFile.size
        }
      }
      return null // 如果不是 Blob 类型，返回 null
    })

    // 等待所有贴图上传完成
    const textureInfos = await Promise.all(texturePromises)

    // 更新模型的贴图总大小
    await prisma.model.update({
      where: { id: modelId },
      data: {
        texturesSize: {
          increment: totalTextureSize
        }
      }
    })

    // 如果是DAE文件，需要更新贴图引用
    if (model.format === 'dae') {
      try {
        if (!model.componentName) {
          throw new Error('Component name is required for DAE files')
        }
        
        // 获取DAE文件内容
        const daeFilePath = `models/dae/${model.componentName}/${model.componentName}.dae`
        const daeContent = await storageClient.get(daeFilePath)
        
        // 更新贴图引用
        const updatedContent = await updateDaeTextureReferences(daeContent.content.toString('utf8'), textureInfos.filter(Boolean) as TextureInfo[])
        
        // 将更新后的内容重新上传到存储服务
        await storageClient.put(daeFilePath, Buffer.from(updatedContent))
      } catch (error) {
        console.error('处理DAE文件失败:', error)
        throw error
      }
    }

    return NextResponse.json({ 
      success: true,
      message: '贴图上传成功'
    })
    
  } catch (error) {
    console.error('上传错误:', error)
    return NextResponse.json(
      { error: '上传失败' },
      { status: 500 }
    )
  }
}

// 添加类型定义
interface TextureInfo {
  name: string
  filePath: string
  fileSize: number
}

// 更新DAE文件中的贴图引用
async function updateDaeTextureReferences(
  daeContent: string, 
  textures: TextureInfo[]
): Promise<string> {
  try {
    // 为每个贴图创建映射关系
    const textureMap = new Map<string, string>()
    textures.forEach(texture => {
      // 获取原始文件名
      const originalName = path.basename(texture.name)
      // 获取新的文件名（从完整路径中提取）
      const newName = path.basename(texture.filePath)
      // 存储映射关系
      textureMap.set(originalName, `textures/${newName}`)
    })

    // 替换所有贴图引用
    return daeContent.replace(
      /<init_from>\.(\/)?([^<]+)<\/init_from>/g,
      (match: string, _: string | undefined, fileName: string) => {
        // 获取原始文件名
        const originalName = path.basename(fileName)
        // 查找新的路径
        const newPath = textureMap.get(originalName)
        if (newPath) {
          return `<init_from>./${newPath}</init_from>`
        }
        return match // 如果没找到对应的贴图，保持原样
      }
    )
  } catch (error) {
    console.error('更新DAE贴图引用失败:', error)
    throw error
  }
}
