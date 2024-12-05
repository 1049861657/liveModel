'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useDebounce } from '@/hooks/useDebounce'
import { useSession } from 'next-auth/react'

export default function ModelFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [format, setFormat] = useState(searchParams.get('format') || '')
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest')
  const [owner, setOwner] = useState(searchParams.get('owner') || 'all')
  const [showFavorites, setShowFavorites] = useState(searchParams.get('favorites') === 'true')

  // 使用防抖来处理搜索
  const debouncedSearch = useDebounce(search, 500)

  // 确保组件挂载时应用 URL 中的过滤条件
  useEffect(() => {
    const ownerParam = searchParams.get('owner')
    if (ownerParam) {
      setOwner(ownerParam)
    }
  }, [searchParams])

  // 更新 URL 参数
  const updateFilters = useCallback((
    newSearch?: string,
    newFormat?: string,
    newSort?: string,
    newOwner?: string,
    newFavorites?: string
  ) => {
    const params = new URLSearchParams(searchParams.toString())
    
    if (newSearch !== undefined) {
      if (newSearch) {
        params.set('search', newSearch)
      } else {
        params.delete('search')
      }
    }
    
    if (newFormat !== undefined) {
      if (newFormat) {
        params.set('format', newFormat)
      } else {
        params.delete('format')
      }
    }
    
    if (newSort !== undefined) {
      if (newSort) {
        params.set('sort', newSort)
      } else {
        params.delete('sort')
      }
    }

    if (newOwner !== undefined) {
      if (newOwner && newOwner !== 'all') {
        params.set('owner', newOwner)
      } else {
        params.delete('owner')
      }
    }

    if (newFavorites !== undefined) {
      if (newFavorites === 'true') {
        params.set('favorites', 'true')
      } else {
        params.delete('favorites')
      }
    }

    router.push(`/models?${params.toString()}`)
  }, [router, searchParams])

  // 监听防抖后的搜索值变化
  useEffect(() => {
    updateFilters(debouncedSearch, undefined, undefined, undefined, undefined)
  }, [debouncedSearch, updateFilters])

  return (
    <div className="flex flex-col gap-4">
      {session && (
        <div className="flex justify-end">
          <div className="inline-flex rounded-lg overflow-hidden">
            <button
              onClick={() => {
                setShowFavorites(false)
                updateFilters(undefined, undefined, undefined, undefined, 'false')
              }}
              className={`px-4 py-2 text-sm font-medium ${
                !showFavorites 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              全部
            </button>
            <button
              onClick={() => {
                setShowFavorites(true)
                updateFilters(undefined, undefined, undefined, undefined, 'true')
              }}
              className={`px-4 py-2 text-sm font-medium ${
                showFavorites 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              已收藏
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="搜索模型..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {session && (
            <select
              value={owner}
              onChange={(e) => {
                setOwner(e.target.value)
                updateFilters(undefined, undefined, undefined, e.target.value, undefined)
              }}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">所有模型</option>
              <option value="mine">我的模型</option>
            </select>
          )}
          <select
            value={format}
            onChange={(e) => {
              setFormat(e.target.value)
              updateFilters(undefined, e.target.value, undefined, undefined, undefined)
            }}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">所有格式</option>
            <option value="glb">GLB</option>
            <option value="dae">DAE</option>
            <option value="gltf">GLTF</option>
            <option value="fbx">FBX</option>
            <option value="obj">OBJ</option>
          </select>
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value)
              updateFilters(undefined, undefined, e.target.value, undefined, undefined)
            }}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="newest">最新上传</option>
            <option value="oldest">最早上传</option>
            <option value="name">名称排序</option>
            <option value="favorites">收藏排序</option>
          </select>
        </div>
      </div>
    </div>
  )
} 