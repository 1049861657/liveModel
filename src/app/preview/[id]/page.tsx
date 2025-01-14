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
  searchParams: { engine?: string }
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
  const isDAE = fileExt.endsWith('.dae')
  const isGLTF = fileExt.endsWith('.gltf')
  const isGLB = fileExt.endsWith('.glb')

  return (
    <div className="min-h-screen bg-gray-50">
      {isDAE ? (
        <PreviewDaeScene initialModel={model} />
      ) : (isGLTF || isGLB) && searchParams.engine === 'gltf' ? (
        <PreviewGltfScene initialModel={model} />
      ) : (
        <PreviewGlbScene initialModel={model} />
      )}
    </div>
  )
} 