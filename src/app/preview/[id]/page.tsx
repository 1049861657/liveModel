import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import PreviewGlbScene from '@/components/preview/PreviewGlbScene'
import PreviewDaeScene from '@/components/preview/PreviewDaeScene'
import PreviewGltfScene from '@/components/preview/PreviewGltfScene'

async function getModelData(id: string) {
  try {
    const model = await prisma.model.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: {
              select: {
                url: true
              }
            }
          }
        }
      }
    })

    if (!model) {
      return null
    }

    return model
  } catch (error) {
    console.error('获取模型数据失败:', error)
    return null
  }
}

export default async function PreviewPage({ 
  params,
  searchParams
}: { 
  params: { id: string }
  searchParams: { engine?: 'dae' | 'gltf' | 'glb' }
}) {
  console.log('Fetching model for preview, ID:', params.id)

  const model = await prisma.model.findUnique({
    where: { id: params.id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: {
            select: {
              url: true
            }
          }
        }
      },
      animations: {
        select: {
          id: true,
          name: true,
          filePath: true,
          fileSize: true
        }
      }
    }
  })

  if (!model) {
    notFound()
  }

  // 检查文件类型
  const fileExt = model.filePath.toLowerCase()
  let defaultEngine = 'glb'

  if (fileExt.endsWith('.dae')) {
    defaultEngine = 'dae'
  } else if (fileExt.endsWith('.gltf')) {
    defaultEngine = 'gltf'
  }

  // 使用 engine 参数或默认引擎
  const engine = searchParams.engine || defaultEngine

  return (
    <div className="min-h-screen bg-gray-50">
      {engine === 'dae' ? (
        <PreviewDaeScene initialModel={model} />
      ) : engine === 'gltf' ? (
        <PreviewGltfScene initialModel={model} />
      ) : (
        <PreviewGlbScene initialModel={model} />
      )}
    </div>
  )
} 