import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { storageClient } from '@/lib/oss'
import path from 'path'
import { Prisma } from '@prisma/client'

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
    if (!['.glb', '.dae', '.gltf'].includes(fileExt)) {
      return NextResponse.json(
        { error: '目前仅支持 .glb、.gltf 和 .dae 格式' },
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
    
    // 上传模型文件到存储服务
    const modelOssPath = `models/${fileExt === '.dae' ? 'dae' : fileExt === '.gltf' ? 'gltf' : 'glb'}/${componentName}/${filename}`
    const modelResult = await storageClient.put(modelOssPath, modelBuffer)

    // 处理 GLTF 相关文件
    const gltfFiles: FormDataEntryValue[] = []
    if (fileExt === '.gltf') {
      formData.forEach((value, key) => {
        if (key.startsWith('gltf_')) {
          gltfFiles.push(value)
        }
      })

      // 获取原始文件夹名称（不包含时间戳）
      const originalFolderName = fileNameWithoutExt.split('_')[0]

      // 上传所有 GLTF 相关文件，保持原始路径结构
      for (const gltfFile of gltfFiles) {
        if (gltfFile instanceof Blob) {
          const fileBuffer = Buffer.from(await gltfFile.arrayBuffer())
          const originalFileName = 'name' in gltfFile ? gltfFile.name : `file_${Date.now()}`
          
          // 如果是主 GLTF 文件，跳过
          if (originalFileName.toLowerCase() === originalName.toLowerCase()) {
            continue // 跳过，因为主 GLTF 文件已经上传
          }
          
          // 获取相对于原始文件夹的路径
          const relativePath = originalFileName.replace(new RegExp(`^${originalFolderName}/?`), '')
          
          // 构建新的文件路径，所有文件放在时间戳文件夹下
          const filePath = `models/gltf/${componentName}/${relativePath}`
          await storageClient.put(filePath, fileBuffer)
        }
      }
    }

    // 处理贴图文件
    const texturePromises: Promise<TextureInfo>[] = []
    if (textureFiles.length > 0 && fileExt !== '.gltf') {  // 对于 GLTF，贴图已经在上面处理过了
      for (const textureFile of textureFiles) {
        if (textureFile instanceof Blob) {
          const texturePromise = (async () => {
            const textureBuffer = Buffer.from(await textureFile.arrayBuffer())
            const textureName = 'name' in textureFile ? textureFile.name : `texture_${Date.now()}`
            const textureFilename = `${Date.now()}_${textureName}`
            const textureOssPath = `models/${fileExt === '.dae' ? 'dae' : 'glb'}/${componentName}/textures/${textureFilename}`
            
            // 上传贴图到存储服务
            const textureResult = await storageClient.put(textureOssPath, textureBuffer)
            
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
      // 重新上传更新后的文件到存储服务
      await storageClient.put(modelOssPath, finalModelBuffer)
    }
    
    try {
      // 使用事务保存模型和贴图信息
      const model = await prisma.model.create({
        data: {
          name,
          description,
          filePath: modelResult.url,
          fileSize: modelFile.size,
          format: fileExt.slice(1),
          componentName,
          isPublic,
          userId: session.user.id,
          textures: {
            create: textures.map(texture => ({
              name: texture.name,
              filePath: texture.filePath,
              fileSize: texture.fileSize,
              userId: session.user.id
            }))
          }
        }
      })

      return NextResponse.json(model)
    } catch (error) {
      // 数据库操作失败，清理已上传的文件
      console.error('数据库操作失败，开始清理文件:', error)
      
      try {
        // 删除主模型文件
        await storageClient.delete(modelOssPath)
        
        // 删除 GLTF 相关文件
        if (fileExt === '.gltf') {
          for (const gltfFile of gltfFiles) {
            if (gltfFile instanceof Blob) {
              const fileName = 'name' in gltfFile ? gltfFile.name : `file_${Date.now()}`
              const filePath = `models/gltf/${componentName}/${fileName}`
              await storageClient.delete(filePath)
            }
          }
        }
        
        // 删除贴图文件
        for (const texture of textures) {
          const texturePath = new URL(texture.filePath).pathname
          await storageClient.delete(texturePath.slice(1)) // 移除开头的斜杠
        }
      } catch (cleanupError) {
        console.error('清理文件失败:', cleanupError)
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2028') {
          return NextResponse.json(
            { error: '数据库事务超时，请重试' },
            { status: 500 }
          )
        }
      }
      
      throw error
    }
    
  } catch (error) {
    console.error('上传错误:', error)
    return NextResponse.json(
      { error: '上传失败' },
      { status: 500 }
    )
  }
}
