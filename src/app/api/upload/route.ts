import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'
import path from 'path'
import { prisma } from '@/lib/db'
import { ossClient } from '@/lib/oss'

// 添加类型定义
interface TextureInfo {
  name: string
  filePath: string
  fileSize: number
}

// 添加处理 DAE 文件的函数
async function updateDaeTextureReferences(
  daeContent: string,
  textures: TextureInfo[], 
  componentName: string
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
      textureMap.set(originalName, `${componentName}/textures/${newName}`)
    })

    // 替换所有贴图引用
    return daeContent.replace(
      /<init_from>\.(\/)?([^<]+)<\/init_from>/g,
      (match, slash, fileName) => {
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
    console.error('更新 DAE 贴图引用失败:', error)
    throw error
  }
}

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
    const modelFile = formData.get('model')
    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const isPublic = formData.get('isPublic') === 'true'
    
    // 收集所有贴图文件
    const textureFiles: FormDataEntryValue[] = []
    formData.forEach((value, key) => {
      if (key.startsWith('texture_')) {
        textureFiles.push(value)
      }
    })

    if (!modelFile || !name || !(modelFile instanceof Blob)) {
      return NextResponse.json(
        { error: '缺少必要的字段' },
        { status: 400 }
      )
    }

    // 验证文件大小
    const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
    if (modelFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: '文件大小超过限制' },
        { status: 400 }
      )
    }

    // 获取原始文件名
    const originalName = 'name' in modelFile ? modelFile.name : 'model'
    const fileExt = path.extname(originalName).toLowerCase()

    // 验证文件扩展名
    if (!['.glb', '.dae'].includes(fileExt)) {
      return NextResponse.json(
        { error: '目前仅支持 .glb 和 .dae 格式' },
        { status: 400 }
      )
    }

    const modelBuffer = Buffer.from(await modelFile.arrayBuffer())
    
    // 生成基于文件名和时间戳的组件名
    const timestamp = Date.now()
    const fileNameWithoutExt = path.basename(originalName, fileExt)
    const componentBaseName = name || fileNameWithoutExt
    const componentName = `${componentBaseName}_${timestamp}`
    const filename = `${componentName}${fileExt}`
    
    // 上传模型文件到OSS
    const modelOssPath = `models/${fileExt === '.dae' ? 'dae' : 'glb'}/${filename}`
    const modelResult = await ossClient.put(modelOssPath, modelBuffer)

    // 处理贴图文件
    const texturePromises: Promise<TextureInfo>[] = []
    if (textureFiles.length > 0) {
      for (const textureFile of textureFiles) {
        if (textureFile instanceof Blob) {
          const texturePromise = (async () => {
            const textureBuffer = Buffer.from(await textureFile.arrayBuffer())
            const textureName = 'name' in textureFile ? textureFile.name : `texture_${Date.now()}`
            const textureFilename = `${Date.now()}_${textureName}`
            const textureOssPath = `models/${fileExt === '.dae' ? 'dae' : 'glb'}/${componentName}/textures/${textureFilename}`
            
            // 上传贴图到OSS
            const textureResult = await ossClient.put(textureOssPath, textureBuffer)
            
            return {
              name: textureName,
              filePath: textureResult.url,
              fileSize: textureFile.size
            }
          })()
          texturePromises.push(texturePromise)
        }
      }
    }

    // 等待所有贴图上传完成
    const textures = await Promise.all(texturePromises)

    // 如果是 DAE 文件且有贴图，更新贴图引用
    let finalModelBuffer = modelBuffer
    if (fileExt === '.dae' && textures.length > 0) {
      const daeContent = modelBuffer.toString('utf8')
      const updatedContent = await updateDaeTextureReferences(daeContent, textures, componentName)
      finalModelBuffer = Buffer.from(updatedContent)
      // 重新上传更新后的DAE文件
      await ossClient.put(modelOssPath, finalModelBuffer)
    }
    
    // 使用事务保存模型和贴图信息
    const model = await prisma.$transaction(async (tx) => {
      // 创建模型记录
      const model = await tx.model.create({
        data: {
          name,
          description: description || null,
          filePath: modelResult.url,
          fileSize: modelFile.size,
          format: fileExt.replace('.', ''),
          userId: session.user.id,
          componentName: componentName,
          isPublic,
        }
      })

      // 创建贴图记录
      if (textures.length > 0) {
        await tx.texture.createMany({
          data: textures.map(texture => ({
            ...texture,
            modelId: model.id
          }))
        })
      }

      return model
    })
    
    return NextResponse.json({ 
      success: true,
      filepath: model.filePath,
      modelId: model.id,
      componentName: model.componentName
    })
    
  } catch (error) {
    console.error('上传错误:', error)
    return NextResponse.json(
      { error: '上传失败' },
      { status: 500 }
    )
  }
}
