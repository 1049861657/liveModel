'use client'

import React, { useState, useEffect, useRef } from 'react'
import { type Model } from '@prisma/client'
import ModelCard from './ModelCard'
import { useSearchParams } from 'next/navigation'
import { formatFileType } from '@/utils/format'
import { useSession } from 'next-auth/react'
import Pagination from '../ui/Pagination'
import clsx from 'clsx'

interface ModelListProps {
  initialModels: any[]
}

export default function ModelList({ initialModels }: ModelListProps) {
  // 确保每个模型都有必要的字段
  const processedInitialModels = initialModels.map(model => ({
    ...model,
    _count: {
      favorites: model._count?.favorites || 0,
      reviews: model._count?.reviews || 0
    },
    isFavorited: !!model.isFavorited
  }))

  const [filteredModels, setFilteredModels] = useState(processedInitialModels)
  const [models, setModels] = useState(processedInitialModels)
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const highlightModelId = searchParams.get('highlight')
  
  // 使用 useRef 跟踪上一次的查询参数
  const prevOwner = useRef<string | null>(null)
  const prevFavorites = useRef<string | null>(null)

  // 添加分页和视图相关状态
  const [currentPage, setCurrentPage] = useState(1)
  const [viewSize, setViewSize] = useState<'large' | 'medium' | 'small'>('large')

  // 根据视图大小决定每页显示数量
  const getItemsPerPage = () => {
    switch (viewSize) {
      case 'small': return 20  // 5列 x 4行
      case 'medium': return 12 // 4列 x 3行
      case 'large': return 9   // 3列 x 3行
      default: return 9
    }
  }

  // 计算分页数据
  const itemsPerPage = getItemsPerPage()
  const totalPages = Math.ceil(filteredModels.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const displayedModels = filteredModels.slice(startIndex, startIndex + itemsPerPage)

  // 刷新列表的函数
  const refreshList = async () => {
    try {
      const owner = searchParams.get('owner')
      const favorites = searchParams.get('favorites')
      
      // 构建查询参数
      const queryParams = new URLSearchParams()
      if (owner === 'mine') queryParams.append('owner', 'mine')
      if (favorites === 'true') queryParams.append('favorites', 'true')
      
      // 使用构建的查询参数
      const response = await fetch(`/api/models${queryParams.toString() ? `?${queryParams.toString()}` : ''}`)
      if (!response.ok) throw new Error('获取模型列表失败')
      const data = await response.json()
      setModels(data)
    } catch (error) {
      console.error('刷新列表失败:', error)
    }
  }

  // 只在必要时刷新列表
  useEffect(() => {
    const owner = searchParams.get('owner')
    const favorites = searchParams.get('favorites')
    
    // 只有当所有者或收藏状态改变时才刷新
    if (owner !== prevOwner.current || favorites !== prevFavorites.current) {
      prevOwner.current = owner
      prevFavorites.current = favorites
      refreshList()
    }
  }, [searchParams])

  // 当过滤条件改变时，重置页码
  useEffect(() => {
    setCurrentPage(1)
  }, [searchParams])

  // 使用防抖处理过滤逻辑
  useEffect(() => {
    const debounceTimeout = setTimeout(() => {
      let result = [...models]
      
      // 应用搜索过滤
      const search = searchParams.get('search')
      if (search) {
        result = result.filter(model => 
          model.name.toLowerCase().includes(search.toLowerCase()) ||
          (model.description && model.description.toLowerCase().includes(search.toLowerCase()))
        )
      }

      // 应用格式过滤
      const format = searchParams.get('format')
      if (format) {
        result = result.filter(model => 
          formatFileType(model.format).toLowerCase() === format.toLowerCase()
        )
      }

      // 应用排序
      const sort = searchParams.get('sort')
      if (sort) {
        result.sort((a, b) => {
          switch (sort) {
            case 'newest':
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            case 'oldest':
              return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            case 'name':
              return a.name.localeCompare(b.name)
            case 'favorites':
              return (b._count?.favorites || 0) - (a._count?.favorites || 0)
            default:
              return 0
          }
        })
      }

      // 应用所有权过滤
      const owner = searchParams.get('owner')
      if (owner === 'mine' && session?.user?.id) {
        result = result.filter(model => model.userId === session.user.id)
      }

      setFilteredModels(result)
    }, 300)  // 300ms 防抖

    return () => clearTimeout(debounceTimeout)
  }, [models, searchParams, session])

  // 在组件挂载时，如果有高亮模型，自动打开其详情
  useEffect(() => {
    if (highlightModelId) {
      const model = models.find(m => m.id === highlightModelId)
      if (model) {
        // 找到对应的 ModelCard 组件并触发其详情显示
        // 这里我们需要修改 ModelCard 组件，添加 ref 和显示控制
        const element = document.getElementById(`model-${highlightModelId}`)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }
    }
  }, [highlightModelId, models])

  return (
    <div className="space-y-6">
      {/* 视图切换按钮 - 移动到搜索栏旁边 */}
      <div className="fixed top-[76px] right-4 z-20 flex bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border border-gray-100 p-1">
        {/* 大图视图按钮 */}
        <button
          onClick={() => setViewSize('large')}
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

        {/* 中图视图按钮 */}
        <button
          onClick={() => setViewSize('medium')}
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

        {/* 小图视图按钮 */}
        <button
          onClick={() => setViewSize('small')}
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

      {/* 模型网格 */}
      <div className={clsx(
        'grid gap-6',
        viewSize === 'small' && 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
        viewSize === 'medium' && 'grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
        viewSize === 'large' && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
      )}>
        {displayedModels.map((model) => (
          <ModelCard 
            key={model.id} 
            model={model} 
            onDelete={refreshList}
            defaultOpen={model.id === highlightModelId}
            id={`model-${model.id}`}
            size={viewSize}
          />
        ))}
        {filteredModels.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            没有找到匹配的模型
          </div>
        )}
      </div>

      {/* 分页控件 */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  )
} 