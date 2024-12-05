'use client'

import dynamic from 'next/dynamic'
import React, { Suspense, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { ThreeComponentsProps } from '@/components/model/ThreeComponents'

// 动态导入 Canvas 和其他 three.js 相关组件
const ThreeComponents = dynamic<ThreeComponentsProps>(
  () => import('@/components/model/ThreeComponents'),
  { ssr: false } // 禁用服务器端渲染
)

interface DemoModel {
  id: string
  name: string
}

interface ModelViewerProps {
  initialModels: DemoModel[]
}

// 示例模型展示组件
export default function ModelViewer({ initialModels }: ModelViewerProps) {
  const router = useRouter()
  
  // 处理模型点击
  const handleModelClick = (modelId: string) => {
    router.push(`/test?model=${modelId}`)
  }
  
  // 根据模型数量动态设置布局类名
  const getGridClassName = (count: number) => {
    switch (count) {
      case 1:
        return "grid-cols-1 max-w-2xl mx-auto"
      case 2:
        return "grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto"
      case 3:
        return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
      default:
        return "grid-cols-1"
    }
  }
  
  return (
    <div className={`grid ${getGridClassName(initialModels.length)} gap-6 h-[400px]`}>
      {initialModels.map((model) => (
        <div 
          key={model.id} 
          className={`relative w-full h-full bg-gray-100 rounded-lg overflow-hidden shadow-lg
            ${initialModels.length === 1 ? 'aspect-square' : ''}`}
        >
          <Suspense fallback={
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-gray-500">加载中...</div>
            </div>
          }>
            <ThreeComponents modelId={model.id} />
          </Suspense>
          
          {/* 可点击的模型名称标签 */}
          <div 
            onClick={() => handleModelClick(model.id)}
            className="absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm text-white p-3 
              text-center font-medium cursor-pointer hover:bg-black/60 transition-colors"
          >
            {model.name}
          </div>
        </div>
      ))}
    </div>
  )
} 