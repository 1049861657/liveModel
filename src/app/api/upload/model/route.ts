import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { storageClient } from '@/lib/oss'
import path from 'path'
import { Prisma } from '@prisma/client'

// 常量配置
const CONFIG = {
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  SUPPORTED_FORMATS: ['.glb', '.dae', '.gltf'] as const,
  STORAGE_BASE_PATH: 'models'
} as const

// 类型定义
type SupportedFormat = (typeof CONFIG.SUPPORTED_FORMATS)[number]

interface UploadedFile {
  buffer: Buffer
  originalName: string
  size: number
  type?: string
}

interface TextureInfo {
  name: string
  filePath: string
  fileSize: number
}

interface ModelUploadResult {
  url: string
  textures: TextureInfo[]
}

interface UploadContext {
  componentName: string
  format: SupportedFormat
  userId: string
}

// 错误类型
class UploadError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400
  ) {
    super(message)
    this.name = 'UploadError'
  }
}

// 工具函数
function getFormatFromExt(ext: string): SupportedFormat {
  const format = ext as SupportedFormat
  if (!CONFIG.SUPPORTED_FORMATS.includes(format)) {
    throw new UploadError('不支持的文件格式')
  }
  return format
}

function generateComponentName(baseName: string): string {
  const timestamp = Date.now()
  return `${baseName}_${timestamp}`
}

// 验证函数
function validateModelFile(file: UploadedFile) {
  if (file.size > CONFIG.MAX_FILE_SIZE) {
    throw new UploadError('文件大小超过限制')
  }

  const ext = path.extname(file.originalName).toLowerCase() as SupportedFormat
  if (!CONFIG.SUPPORTED_FORMATS.includes(ext)) {
    throw new UploadError('不支持的文件格式')
  }

  return ext
}

// 处理 DAE 文件中的贴图引用
async function updateDaeTextureReferences(
  daeContent: string,
  textures: TextureInfo[],
  componentName: string
): Promise<string> {
  try {
    const textureMap = new Map<string, string>()
    textures.forEach(texture => {
      const originalName = path.basename(texture.name)
      const newName = path.basename(texture.filePath)
      textureMap.set(originalName, `textures/${newName}`)
    })

    return daeContent.replace(
      /<init_from>\.(\/)?([^<]+)<\/init_from>/g,
      (match, slash, fileName) => {
        const originalName = path.basename(fileName)
        const newPath = textureMap.get(originalName)
        return newPath ? `<init_from>./${newPath}</init_from>` : match
      }
    )
  } catch (error) {
    console.error('更新 DAE 贴图引用失败:', error)
    throw new UploadError('更新贴图引用失败', 500)
  }
}

// 处理模型文件上传
async function handleModelUpload(
  file: UploadedFile,
  context: UploadContext
): Promise<string> {
  const filename = `${context.componentName}${context.format}`
  const ossPath = `${CONFIG.STORAGE_BASE_PATH}/${context.format.slice(1)}/${context.componentName}/${filename}`
  
  try {
    const result = await storageClient.put(ossPath, file.buffer)
    return result.url
  } catch (error) {
    console.error('上传模型文件失败:', error)
    throw new UploadError('上传模型文件失败', 500)
  }
}

// 处理贴图文件上传
async function handleTextureUpload(
  textureFiles: UploadedFile[],
  context: UploadContext
): Promise<TextureInfo[]> {
  const texturePromises = textureFiles.map(async (file) => {
    const timestamp = Date.now()
    const filename = `${timestamp}_${file.originalName}`
    const ossPath = `${CONFIG.STORAGE_BASE_PATH}/${context.format.slice(1)}/${context.componentName}/textures/${filename}`

    try {
      const result = await storageClient.put(ossPath, file.buffer)
      return {
        name: file.originalName,
        filePath: result.url,
        fileSize: file.size
      }
    } catch (error) {
      console.error('上传贴图失败:', error)
      throw new UploadError('上传贴图失败', 500)
    }
  })

  return Promise.all(texturePromises)
}

// 处理 GLTF 相关文件上传
async function handleGltfFilesUpload(
  gltfFiles: UploadedFile[],
  context: UploadContext,
  mainFileName: string
): Promise<void> {
  for (const file of gltfFiles) {
    if (file.originalName.toLowerCase() === mainFileName.toLowerCase()) {
      continue
    }

    const pathParts = file.originalName.split(/[\/\\]/)
    pathParts.shift()
    const targetPath = pathParts.join('/')
    const ossPath = `${CONFIG.STORAGE_BASE_PATH}/gltf/${context.componentName}/${targetPath}`

    try {
      await storageClient.put(ossPath, file.buffer)
    } catch (error) {
      console.error('上传 GLTF 相关文件失败:', error)
      throw new UploadError('上传 GLTF 相关文件失败', 500)
    }
  }
}

// 清理已上传的文件
async function cleanupUploadedFiles(
  modelPath: string,
  textures: TextureInfo[],
  gltfFiles: UploadedFile[],
  context: UploadContext
) {
  try {
    await storageClient.delete(modelPath)

    if (context.format === '.gltf') {
      for (const file of gltfFiles) {
        const filePath = `${CONFIG.STORAGE_BASE_PATH}/gltf/${context.componentName}/${file.originalName}`
        await storageClient.delete(filePath)
      }
    }

    for (const texture of textures) {
      const texturePath = new URL(texture.filePath).pathname
      await storageClient.delete(texturePath.slice(1))
    }
  } catch (error) {
    console.error('清理文件失败:', error)
  }
}

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: Request) {
  let modelPath = ''
  let uploadedTextures: TextureInfo[] = []
  let gltfFiles: UploadedFile[] = []

  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      throw new UploadError('请先登录', 401)
    }

    const formData = await request.formData()
    const modelFile = formData.get('model')
    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const isPublic = formData.get('isPublic') === 'true'
    const texturesSize = parseInt(formData.get('texturesSize') as string) || 0

    if (!modelFile || !name || !(modelFile instanceof Blob)) {
      throw new UploadError('缺少必要字段')
    }

    // 处理模型文件
    const modelBuffer = Buffer.from(await modelFile.arrayBuffer())
    const uploadedFile: UploadedFile = {
      buffer: modelBuffer,
      originalName: 'name' in modelFile ? modelFile.name : 'model',
      size: modelFile.size
    }

    const format = validateModelFile(uploadedFile)
    const componentName = generateComponentName(name)

    const context: UploadContext = {
      componentName,
      format,
      userId: session.user.id
    }

    // 上传模型文件
    const modelUrl = await handleModelUpload(uploadedFile, context)
    modelPath = new URL(modelUrl).pathname.slice(1)

    // 收集并处理贴图文件
    const textureFiles: UploadedFile[] = []
    if (format !== '.gltf') {
      for (const [key, value] of formData.entries()) {
        if (key.startsWith('texture_') && value instanceof Blob) {
          textureFiles.push({
            buffer: Buffer.from(await value.arrayBuffer()),
            originalName: 'name' in value ? value.name : `texture_${Date.now()}`,
            size: value.size
          })
        }
      }
      uploadedTextures = await handleTextureUpload(textureFiles, context)
    }

    // 处理 GLTF 相关文件
    if (format === '.gltf') {
      for (const [key, value] of formData.entries()) {
        if (key.startsWith('gltf_') && value instanceof Blob) {
          gltfFiles.push({
            buffer: Buffer.from(await value.arrayBuffer()),
            originalName: 'name' in value ? value.name : `file_${Date.now()}`,
            size: value.size
          })
        }
      }
      await handleGltfFilesUpload(gltfFiles, context, uploadedFile.originalName)
    }

    // 如果是 DAE 文件且有贴图，更新贴图引用
    if (format === '.dae' && uploadedTextures.length > 0) {
      const daeContent = modelBuffer.toString('utf8')
      const updatedContent = await updateDaeTextureReferences(
        daeContent,
        uploadedTextures,
        componentName
      )
      const filename = `${componentName}${format}`
      const ossPath = `${CONFIG.STORAGE_BASE_PATH}/${format.slice(1)}/${componentName}/${filename}`
      await storageClient.put(ossPath, Buffer.from(updatedContent))
    }

    // 保存到数据库
    const model = await prisma.model.create({
      data: {
        name,
        description,
        filePath: modelUrl,
        fileSize: uploadedFile.size,
        format: format.slice(1),
        componentName,
        isPublic,
        userId: session.user.id,
        texturesSize
      }
    })

    return NextResponse.json(model)

  } catch (error) {
    console.error('上传错误:', error)

    // 如果已经上传了文件，清理它们
    if (modelPath) {
      await cleanupUploadedFiles(modelPath, uploadedTextures, gltfFiles, {
        componentName: modelPath.split('/')[2], // 从路径中提取
        format: path.extname(modelPath) as SupportedFormat,
        userId: ''
      })
    }

    if (error instanceof UploadError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2028') {
        return NextResponse.json(
          { error: '数据库事务超时，请重试' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json(
      { error: '上传失败' },
      { status: 500 }
    )
  }
}
