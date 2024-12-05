'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'

interface DemoModel {
  id: string
  name: string
}

interface ModelPreviewWrapperProps {
  initialModels: DemoModel[]
}

const ModelViewer = dynamic(() => import('@/components/model/ModelViewer'), {
  ssr: false,
  loading: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 h-[400px] max-w-7xl mx-auto">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-gray-100 rounded-lg animate-pulse shadow-lg" />
      ))}
    </div>
  )
})

export default function ModelPreviewWrapper({ initialModels }: ModelPreviewWrapperProps) {
  return (
    <div className="w-full">
      <Suspense fallback={
        <div className="flex justify-center items-center h-[400px]">
          <div className="text-gray-500">加载模型中...</div>
        </div>
      }>
        <ModelViewer initialModels={initialModels} />
      </Suspense>
    </div>
  )
} 