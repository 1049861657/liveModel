import { prisma } from '@/lib/db'
import TestScene from '@/components/test/TestScene'

// 在服务器端获取数据
async function getDemoModels() {
  const demoModels = await prisma.demoModel.findMany({
    where: {
      isEnabled: true
    },
    orderBy: {
      order: 'asc'
    },
    select: {
      id: true,
      name: true
    }
  })
  return demoModels
}

export default async function TestPage({
  searchParams,
}: {
  searchParams: { model?: string }
}) {
  // 在服务器端预加载数据
  const demoModels = await getDemoModels()
  
  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <TestScene initialModels={demoModels} initialModelId={searchParams.model} />
    </div>
  )
} 