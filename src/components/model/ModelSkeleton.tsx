'use client'

import { memo } from 'react'
import clsx from 'clsx'

interface ModelSkeletonProps {
  viewSize?: 'large' | 'medium' | 'small'
  count?: number
}

function ModelSkeleton({ viewSize = 'large', count = 6 }: ModelSkeletonProps) {
  return (
    <div className={clsx(
      'grid gap-6',
      viewSize === 'small' && 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
      viewSize === 'medium' && 'grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
      viewSize === 'large' && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
    )}>
      {[...Array(count)].map((_, i) => (
        <div key={i} className="animate-pulse bg-white rounded-xl shadow-lg p-4 space-y-4">
          {/* 缩略图区域 */}
          <div className="aspect-square bg-gray-200 rounded-lg"></div>
          
          {/* 标题区域 */}
          <div className="space-y-2">
            <div className="h-6 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
          
          {/* 标签区域 */}
          <div className="flex gap-2">
            <div className="h-6 bg-gray-200 rounded w-16"></div>
            <div className="h-6 bg-gray-200 rounded w-20"></div>
          </div>
          
          {/* 用户信息区域 */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
            <div className="h-4 bg-gray-200 rounded w-24"></div>
          </div>
          
          {/* 操作按钮区域 */}
          <div className="flex justify-between items-center">
            <div className="h-8 bg-gray-200 rounded w-24"></div>
            <div className="h-8 bg-gray-200 rounded w-8"></div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default memo(ModelSkeleton) 