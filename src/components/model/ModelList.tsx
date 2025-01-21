'use client'

import React, { useState, useEffect } from 'react'
import { type ExtendedModel } from '@/types/model'
import ModelCard from './ModelCard'
import { useSearchParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Pagination from '../ui/Pagination'
import ModelSkeleton from './ModelSkeleton'
import clsx from 'clsx'

interface ModelListProps {
  initialModels: {
    models: ExtendedModel[]
    total: number
    pages: number
  }
}

// 视图切换按钮组件
function ViewSizeToggle({ viewSize, onViewSizeChange }: {
  viewSize: 'large' | 'medium' | 'small'
  onViewSizeChange: (size: 'large' | 'medium' | 'small') => void
}) {
  return (
    <div className="fixed top-[76px] right-4 z-20 flex bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border border-gray-100 p-1">
      <button
        onClick={() => onViewSizeChange('large')}
        className={clsx(
          "p-2 rounded-md transition-all duration-200",
          viewSize === 'large'
            ? "bg-blue-500 text-white shadow-sm"
            : "text-gray-600 hover:bg-gray-100"
        )}
        title="大图视图"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
            d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
          <rect x="6" y="6" width="12" height="12" rx="1" strokeWidth={1.5} />
        </svg>
      </button>

      <button
        onClick={() => onViewSizeChange('medium')}
        className={clsx(
          "p-2 rounded-md transition-all duration-200",
          viewSize === 'medium'
            ? "bg-blue-500 text-white shadow-sm"
            : "text-gray-600 hover:bg-gray-100"
        )}
        title="中图视图"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
        </svg>
      </button>

      <button
        onClick={() => onViewSizeChange('small')}
        className={clsx(
          "p-2 rounded-md transition-all duration-200",
          viewSize === 'small'
            ? "bg-blue-500 text-white shadow-sm"
            : "text-gray-600 hover:bg-gray-100"
        )}
        title="小图视图"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M4 5a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2zM4 21a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2zM12 5a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1V5zM12 13a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1v-2zM12 21a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1v-2zM20 5a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1V5zM20 13a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1v-2zM20 21a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1v-2z" />
        </svg>
      </button>
    </div>
  )
}

// 模型网格组件 (可以是服务器组件)
export function ModelGrid({ 
  models, 
  loading, 
  viewSize,
  highlightModelId,
  onDelete,
}: { 
  models: ExtendedModel[]
  loading: boolean
  viewSize: 'large' | 'medium' | 'small'
  highlightModelId?: string | null
  onDelete: () => void
}) {
  return (
    <div className={clsx(
      'grid gap-6',
      viewSize === 'small' && 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
      viewSize === 'medium' && 'grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
      viewSize === 'large' && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
      loading && 'opacity-50'
    )}>
      {models.map((model) => (
        <ModelCard 
          key={model.id} 
          model={model} 
          onDelete={onDelete}
          defaultOpen={model.id === highlightModelId}
          id={`model-${model.id}`}
          size={viewSize}
        />
      ))}
      {models.length === 0 && !loading && (
        <div className="col-span-full text-center py-12 text-gray-500">
          没有找到匹配的模型
        </div>
      )}
    </div>
  )
}

// 客户端列表组件
export default function ModelListClient({ initialModels }: ModelListProps) {
  const [models, setModels] = useState(initialModels.models)
  const [total, setTotal] = useState(initialModels.total)
  const [pages, setPages] = useState(initialModels.pages)
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session } = useSession()
  const highlightModelId = searchParams.get('highlight')
  const currentPage = parseInt(searchParams.get('page') || '1')
  const [viewSize, setViewSize] = useState<'large' | 'medium' | 'small'>('large')

  // 根据视图大小获取每页显示数量
  const getItemsPerPage = (size: 'large' | 'medium' | 'small') => {
    switch (size) {
      case 'small': return 20  // 5列 x 4行
      case 'medium': return 12 // 4列 x 3行
      case 'large': return 9   // 3列 x 3行
      default: return 9
    }
  }

  // 刷新列表的函数
  const refreshList = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams(searchParams.toString())
      params.set('limit', getItemsPerPage(viewSize).toString())
      const response = await fetch(`/api/models?${params.toString()}`)
      if (!response.ok) throw new Error('获取模型列表失败')
      const data = await response.json()
      setModels(data.models)
      setTotal(data.total)
      setPages(data.pages)
    } catch (error) {
      console.error('刷新列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 当搜索参数改变时刷新列表
  useEffect(() => {
    refreshList()
  }, [searchParams, viewSize])

  // 处理视图大小变化
  const handleViewSizeChange = (newSize: 'large' | 'medium' | 'small') => {
    setViewSize(newSize)
    const params = new URLSearchParams(searchParams.toString())
    params.set('limit', getItemsPerPage(newSize).toString())
    params.set('page', '1') // 重置页码
    router.push(`/models?${params.toString()}`)
  }

  // 处理页码变化
  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', page.toString())
    params.set('limit', getItemsPerPage(viewSize).toString())
    router.push(`/models?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      <ViewSizeToggle viewSize={viewSize} onViewSizeChange={handleViewSizeChange} />
      
      {loading && <ModelSkeleton viewSize={viewSize} count={getItemsPerPage(viewSize)} />}

      {!loading && (
        <ModelGrid 
          models={models}
          loading={loading}
          viewSize={viewSize}
          highlightModelId={highlightModelId}
          onDelete={refreshList}
        />
      )}

      {pages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={pages}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  )
} 