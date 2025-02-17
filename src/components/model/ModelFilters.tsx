'use client'

import { useCallback, useMemo, useTransition, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useDebounce } from '@/hooks/useDebounce'
import { useSession } from 'next-auth/react'
import { useRouter } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'

interface FilterState {
  search: string
  format: string
  sort: string
  owner: string
  favorites: boolean
}

// 过滤按钮组件
const FilterButton = ({ active, onClick, children }: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) => (
  <button
    onClick={onClick}
    className={clsx(
      'px-4 py-2 text-sm font-medium',
      active 
        ? 'bg-blue-500 text-white'
        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    )}
  >
    {children}
  </button>
)

// 主过滤器组件
export default function ModelFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const t = useTranslations('ModelFilters')
  const [, startTransition] = useTransition()

  // 本地状态管理
  const [localFilters, setLocalFilters] = useState<FilterState>({
    search: searchParams.get('search') || '',
    format: searchParams.get('format') || '',
    sort: searchParams.get('sort') || 'newest',
    owner: searchParams.get('owner') || 'all',
    favorites: searchParams.get('favorites') === 'true'
  })
  
  // 使用 react-query 管理过滤状态
  const { refetch: refetchFilters } = useQuery<FilterState>({
    queryKey: ['modelFilters'],
    queryFn: () => localFilters,
    staleTime: Infinity,
    initialData: localFilters
  })

  // 使用 useMemo 缓存选项列表
  const formatOptions = useMemo(() => [
    { value: '', label: t('formatOptions.all') },
    { value: 'glb', label: 'GLB' },
    { value: 'dae', label: 'DAE' },
    { value: 'gltf', label: 'GLTF' },
    { value: 'fbx', label: 'FBX' },
    { value: 'obj', label: 'OBJ' }
  ], [t])

  const sortOptions = useMemo(() => [
    { value: 'newest', label: t('sortOptions.newest') },
    { value: 'oldest', label: t('sortOptions.oldest') },
    { value: 'name', label: t('sortOptions.name') },
    { value: 'favorites', label: t('sortOptions.favorites') }
  ], [t])

  // 优化的 updateFilters 函数
  const updateFilters = useCallback((updates: Partial<FilterState>) => {
    // 立即更新本地状态
    setLocalFilters(prev => {
      const newFilters = { ...prev, ...updates }
      
      // 更新 URL 参数
      const params = new URLSearchParams(searchParams.toString())
      Object.entries(newFilters).forEach(([key, value]) => {
        if (!value || value === '' || (key === 'owner' && value === 'all')) {
          params.delete(key)
        } else {
          params.set(key, String(value))
        }
      })

      // 使用 startTransition 来更新 URL
      startTransition(() => {
        router.push(`/models?${params.toString()}`)
        refetchFilters()
      })

      return newFilters
    })
  }, [router, searchParams, refetchFilters])

  // 使用防抖的搜索处理
  const debouncedSearch = useDebounce(localFilters.search, 800)

  // 监听防抖后的搜索值变化
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    if (debouncedSearch) {
      params.set('search', debouncedSearch)
    } else {
      params.delete('search')
    }
    startTransition(() => {
      router.push(`/models?${params.toString()}`)
      refetchFilters()
    })
  }, [debouncedSearch, router, searchParams, refetchFilters])
  
  // 事件处理函数
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalFilters(prev => ({ ...prev, search: e.target.value }))
  }, [])

  const handleFormatChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    updateFilters({ format: e.target.value })
  }, [updateFilters])

  const handleSortChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    updateFilters({ sort: e.target.value })
  }, [updateFilters])

  const handleOwnerChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    updateFilters({ owner: e.target.value })
  }, [updateFilters])

  return (
    <div className="flex flex-col gap-4">
      {session && (
        <div className="flex justify-end">
          <div className="inline-flex rounded-lg overflow-hidden">
            <FilterButton
              active={!localFilters.favorites}
              onClick={() => updateFilters({ favorites: false })}
            >
              {t('all')}
            </FilterButton>
            <FilterButton
              active={localFilters.favorites}
              onClick={() => updateFilters({ favorites: true })}
            >
              {t('favorites')}
            </FilterButton>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={localFilters.search}
              onChange={handleSearchChange}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {session && (
            <select
              value={localFilters.owner}
              onChange={handleOwnerChange}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">{t('ownerOptions.all')}</option>
              <option value="mine">{t('ownerOptions.mine')}</option>
            </select>
          )}
          <select
            value={localFilters.format}
            onChange={handleFormatChange}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {formatOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={localFilters.sort}
            onChange={handleSortChange}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {sortOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
} 