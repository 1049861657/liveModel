import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { writeFile, mkdir, readFile } from 'fs/promises'
import path from 'path'
import { prisma } from '@/lib/db'

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

    // 创建贴图保存目录
    const baseUploadDir = path.join(process.cwd(), 'public', 'uploads', 'models')
    const modelFormat = model.format // 'dae' 或 'glb'
    const modelDir = path.join(baseUploadDir, modelFormat, model.componentName)
    const textureDir = path.join(modelDir, 'textures')
    await mkdir(textureDir, { recursive: true })

    // 保存贴图文件并记录信息
    const texturePromises = textureFiles.map(async (textureFile) => {
      if (textureFile instanceof Blob) {
        const textureBuffer = Buffer.from(await textureFile.arrayBuffer())
        const textureName = 'name' in textureFile ? textureFile.name : `texture_${Date.now()}`
        const textureFilename = `${Date.now()}_${textureName}`
        const texturePath = path.join(textureDir, textureFilename)
        
        await writeFile(texturePath, textureBuffer)

        return {
          name: textureName,
          filePath: `/uploads/models/${modelFormat}/${model.componentName}/textures/${textureFilename}`,
          fileSize: textureFile.size,
          modelId: model.id
        }
      }
    })

    // 等待所有贴图保存完成
    const textureInfos = await Promise.all(texturePromises)

    // 保存贴图记录到数据库
    await prisma.texture.createMany({
      data: textureInfos.filter(Boolean) as any[]
    })

    // 如果是DAE文件，需要更新贴图引用
    if (model.format === 'dae') {
      const modelFilePath = path.join(process.cwd(), 'public', model.filePath)
      await updateDaeTextureReferences(modelFilePath, textureInfos.filter(Boolean) as any[], model.componentName)
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
  daeFilePath: string, 
  textures: TextureInfo[], 
  componentName: string
): Promise<void> {
  try {
    // 读取DAE文件内容
    let content = await readFile(daeFilePath, 'utf8')
    
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
    content = content.replace(
      /<init_from>\.(\/)?([^<]+)<\/init_from>/g,
      (match: string, slash: string | undefined, fileName: string) => {
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

    // 写回文件
    await writeFile(daeFilePath, content)
  } catch (error) {
    console.error('更新DAE贴图引用失败:', error)
    throw error
  }
}
