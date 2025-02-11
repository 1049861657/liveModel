'use client'

import { memo } from 'react'
import clsx from 'clsx'

// 从 ModelList 导入视图配置以保持一致性
const VIEW_SIZE_CONFIG = {
  small: { cols: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5', itemsPerPage: 20 },
  medium: { cols: 'grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4', itemsPerPage: 12 },
  large: { cols: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3', itemsPerPage: 9 }
} as const

interface ModelSkeletonProps {
  viewSize?: keyof typeof VIEW_SIZE_CONFIG
  count?: number
}

// 骨架屏卡片组件
const SkeletonCard = memo(() => (
  <div className="animate-pulse bg-white rounded-xl shadow-lg p-4 space-y-4">
    {/* 缩略图区域 */}
    <div className="aspect-square bg-gray-200 rounded-lg" />
    
    {/* 标题区域 */}
    <div className="space-y-2">
      <div className="h-6 bg-gray-200 rounded w-3/4" />
      <div className="h-4 bg-gray-200 rounded w-1/2" />
    </div>
    
    {/* 标签区域 */}
    <div className="flex gap-2">
      <div className="h-6 bg-gray-200 rounded w-16" />
      <div className="h-6 bg-gray-200 rounded w-20" />
    </div>
    
    {/* 用户信息区域 */}
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 bg-gray-200 rounded-full" />
      <div className="h-4 bg-gray-200 rounded w-24" />
    </div>
    
    {/* 操作按钮区域 */}
    <div className="flex justify-between items-center">
      <div className="h-8 bg-gray-200 rounded w-24" />
      <div className="h-8 bg-gray-200 rounded w-8" />
    </div>
  </div>
))

SkeletonCard.displayName = 'SkeletonCard'

function ModelSkeleton({ viewSize = 'large', count = 6 }: ModelSkeletonProps) {
  // 使用 useMemo 优化数组生成
  const skeletons = Array.from({ length: count }, (_, i) => (
    <SkeletonCard key={i} />
  ))

  return (
    <div 
      className={clsx(
        'grid gap-6',
        VIEW_SIZE_CONFIG[viewSize].cols
      )}
      role="status"
      aria-label="加载中..."
    >
      {skeletons}
    </div>
  )
}

export default memo(ModelSkeleton) 