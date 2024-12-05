import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import PreviewScene from '@/components/preview/PreviewScene'
import PreviewDaeScene from '@/components/preview/PreviewDaeScene'

async function getModelData(id: string) {
  try {
    const model = await prisma.model.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            name: true,
            email: true,
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

export default async function PreviewPage({ params }: { params: { id: string } }) {
  console.log('Fetching model for preview, ID:', params.id)

  const model = await prisma.model.findUnique({
    where: { id: params.id },
    include: {
      user: {
        select: {
          name: true,
          email: true
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
  const isDAE = model.filePath.toLowerCase().endsWith('.dae')

  return (
    <div className="min-h-screen bg-gray-50">
      {isDAE ? (
        <PreviewDaeScene initialModel={model} />
      ) : (
        <PreviewScene initialModel={model} />
      )}
    </div>
  )
} 