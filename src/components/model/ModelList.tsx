'use client'

import { useState, useCallback } from 'react'
import { type ExtendedModel } from '@/types/model'
import ModelCard from '@/components/model/ModelCard'
import { useSearchParams } from 'next/navigation'
import Pagination from '@/components/ui/Pagination'
import ModelSkeleton from '@/components/model/ModelSkeleton'
import clsx from 'clsx'
import { useRouter } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'

interface ModelListProps {
  initialModels: {
    models: ExtendedModel[]
    total: number
    pages: number
  }
}

// 视图大小配置
const VIEW_SIZE_CONFIG = {
  small: { cols: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5', itemsPerPage: 20 },
  medium: { cols: 'grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4', itemsPerPage: 12 },
  large: { cols: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3', itemsPerPage: 9 }
} as const

// 视图切换按钮组件
function ViewSizeToggle({ viewSize, onViewSizeChange }: {
  viewSize: keyof typeof VIEW_SIZE_CONFIG
  onViewSizeChange: (size: keyof typeof VIEW_SIZE_CONFIG) => void
}) {
  const t = useTranslations('ModelList')
  
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
        title={t('viewSizes.large')}
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
        title={t('viewSizes.medium')}
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
        title={t('viewSizes.small')}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M4 5a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2zM4 21a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2zM12 5a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1V5zM12 13a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1v-2zM12 21a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1v-2zM20 5a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1V5zM20 13a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1v-2zM20 21a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1v-2z" />
        </svg>
      </button>
    </div>
  )
}

// 模型网格组件
function ModelGrid({ 
  models, 
  isLoading, 
  viewSize,
  highlightModelId,
  onDelete,
}: { 
  models: ExtendedModel[]
  isLoading: boolean
  viewSize: keyof typeof VIEW_SIZE_CONFIG
  highlightModelId?: string | null
  onDelete: () => void
}) {
  const t = useTranslations('ModelList')
  
  return (
    <div className={clsx(
      'grid gap-6',
      VIEW_SIZE_CONFIG[viewSize].cols,
      isLoading && 'opacity-50'
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
      {models.length === 0 && !isLoading && (
        <div className="col-span-full text-center py-12 text-gray-500">
          {t('noResults')}
        </div>
      )}
    </div>
  )
}

// 客户端列表组件
export default function ModelListClient({ initialModels }: ModelListProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const t = useTranslations('ModelList')
  const highlightModelId = searchParams.get('highlight')
  const currentPage = parseInt(searchParams.get('page') || '1')
  const [viewSize, setViewSize] = useState<keyof typeof VIEW_SIZE_CONFIG>('large')

  // 使用 react-query 获取模型列表
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['models', searchParams.toString(), viewSize],
    queryFn: async () => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('limit', VIEW_SIZE_CONFIG[viewSize].itemsPerPage.toString())
      const response = await fetch(`/api/models?${params.toString()}`)
      if (!response.ok) throw new Error(t('errors.fetchFailed'))
      return response.json()
    },
    initialData: initialModels,
    staleTime: 1000 * 30 // 30秒内不重新获取
  })

  // 处理视图大小变化
  const handleViewSizeChange = useCallback((newSize: keyof typeof VIEW_SIZE_CONFIG) => {
    setViewSize(newSize)
    const params = new URLSearchParams(searchParams.toString())
    params.set('limit', VIEW_SIZE_CONFIG[newSize].itemsPerPage.toString())
    params.set('page', '1') // 重置页码
    router.push(`/models?${params.toString()}`)
  }, [router, searchParams])

  // 处理页码变化
  const handlePageChange = useCallback((page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', page.toString())
    params.set('limit', VIEW_SIZE_CONFIG[viewSize].itemsPerPage.toString())
    router.push(`/models?${params.toString()}`)
  }, [router, searchParams, viewSize])

  return (
    <div className="space-y-6">
      <ViewSizeToggle viewSize={viewSize} onViewSizeChange={handleViewSizeChange} />
      
      {isLoading && <ModelSkeleton viewSize={viewSize} count={VIEW_SIZE_CONFIG[viewSize].itemsPerPage} />}

      {!isLoading && (
        <ModelGrid 
          models={data.models}
          isLoading={isLoading}
          viewSize={viewSize}
          highlightModelId={highlightModelId}
          onDelete={refetch}
        />
      )}

      {data.pages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={data.pages}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  )
} 