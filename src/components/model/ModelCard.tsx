'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { type Model as PrismaModel } from '@prisma/client'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { toast } from 'react-hot-toast'
import { formatTimeDistance, formatFileType, getFileExtension } from '@/utils/format'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import ReviewSection from '@/components/reviews/ReviewSection'
import { type ExtendedModel } from '@/types/model'
import clsx from 'clsx'

interface ModelCardProps {
  model: ExtendedModel
  onDelete?: () => void
  defaultOpen?: boolean
  id?: string
  onClose?: () => void
  modalOnly?: boolean
  size?: 'large' | 'medium' | 'small'
}

function ModelPreview({ model }: { model: ExtendedModel }) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    // 创建 Intersection Observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // 元素进入可视区域，加载 iframe
            const iframe = entry.target as HTMLIFrameElement
            if (!iframe.src) {
              iframe.src = model.format === 'dae'
                ? `/api/thumbnail/dae?model=${encodeURIComponent(model.filePath)}`
                : `/api/thumbnail?model=${encodeURIComponent(model.filePath)}`
            }
          }
        })
      },
      {
        rootMargin: '50px', // 提前 50px 开始加载
        threshold: 0.1
      }
    )

    // 观察 iframe 元素
    if (iframeRef.current) {
      observerRef.current.observe(iframeRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [model.filePath, model.format])

  // 处理加载状态
  const handleLoad = () => {
    setIsLoading(false)
    setHasError(false)
  }

  // 处理错误状态
  const handleError = () => {
    setIsLoading(false)
    setHasError(true)
  }

  return (
    <div className="relative w-full h-full">
      {/* 加载状态 */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      )}

      {/* 错误状态 */}
      {hasError && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p>加载失败</p>
          </div>
        </div>
      )}

      {/* iframe */}
      <iframe
        ref={iframeRef}
        className={`w-full h-full border-none transition-opacity duration-300 ${
          isLoading || hasError ? 'opacity-0' : 'opacity-100'
        }`}
        sandbox="allow-scripts allow-same-origin allow-pointer-lock"
        style={{ pointerEvents: 'auto' }}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  )
}

export default function ModelCard({ model, onDelete, defaultOpen, id, onClose, modalOnly, size = 'large' }: ModelCardProps) {
  const [showDetails, setShowDetails] = useState(defaultOpen || false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const { data: session } = useSession()
  const isOwner = session?.user?.id === model.userId
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(model.name)
  const [isPublic, setIsPublic] = useState(model.isPublic)
  const [isSaving, setIsSaving] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [description, setDescription] = useState(model.description || '')
  const [isFavorited, setIsFavorited] = useState(!!model.isFavorited)
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const maxRetries = 3
  const [modelData, setModelData] = useState(model)
  const [showReviews, setShowReviews] = useState(false)
  const loadingTimeoutRef = useRef<NodeJS.Timeout>()
  const modelDataRef = useRef(model)
  const [timeAgo, setTimeAgo] = useState('')
  const [isVisible, setIsVisible] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const hasLoadedData = useRef(false)  // 添加标记，避免重复加载

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true)
            observer.unobserve(entry.target)
          }
        })
      },
      {
        rootMargin: '100px'
      }
    )

    if (cardRef.current) {
      observer.observe(cardRef.current)
    }

    return () => observer.disconnect()
  }, [])

  // 当 defaultOpen 改变时更新显示状态
  useEffect(() => {
    if (defaultOpen) {
      setShowDetails(true)
    }
  }, [defaultOpen])

  // 使用 useEffect 监听 model.isFavorited 的变化
  useEffect(() => {
    setIsFavorited(!!model.isFavorited)
  }, [model.isFavorited])

  // 修改场景预览处理函数
  const handlePreview = () => {
    setIsTransitioning(true)
    // 先关闭模态口
    setShowDetails(false)
    // 然后延迟跳转
    setTimeout(() => {
      window.location.href = `/preview/${model.id}`
    }, 500)
  }

  // 处理下载
  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!session) {
      toast.error('请先登录')
      router.push('/login')
      return
    }
    
    const link = document.createElement('a')
    link.href = model.filePath
    link.download = `${model.name}.${getFileExtension(model.format)}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // 处理更新模型信息
  const handleUpdateModel = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/models/${model.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          isPublic: isPublic,
          description: description
        })
      })

      if (!response.ok) {
        throw new Error('更新失败')
      }

      toast.success('更新成功')
      // 更新本地状态
      model.name = editName
      model.isPublic = isPublic
      model.description = description
      setIsEditing(false)
    } catch (error) {
      toast.error('更新失败，请稍后重试')
    } finally {
      setIsSaving(false)
    }
  }

  // 处理删除
  const handleDeleteClick = () => {
    setShowConfirmDialog(true)
  }

  const handleConfirmDelete = async () => {
    setDeletingId(model.id)
    setShowConfirmDialog(false)
    
    try {
      const response = await fetch(`/api/models/${model.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('删除失败')
      }

      toast.success('删除成功')
      // 先调用回调
      onDelete?.()
      // 然后关闭模态框和清理状态
      handleClose()
    } catch (error) {
      console.error('删除失败:', error)
      toast.error('删除失败，请稍后重试')
    } finally {
      setDeletingId(null)
    }
  }

  // 修改关闭处理
  const handleClose = () => {
    setShowDetails(false)
    setIsEditing(false)
    onClose?.()
  }

  // 修改收藏点击处理函数
  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!session) {
      toast.error('请先登录')
      router.push('/login')
      return
    }

    setIsTogglingFavorite(true)
    try {
      const response = await fetch(`/api/models/${model.id}/favorite`, {
        method: 'POST'
      })
      const data = await response.json()
      if (response.ok) {
        setIsFavorited(data.isFavorited)
        // 安全地更新收藏数
        if (!model._count) {
          model._count = { 
            favorites: 0,
            reviews: 0 
          }
        }
        model._count.favorites = data.favoriteCount

        if (modelData) {
          if (!modelData._count) {
            modelData._count = { 
              favorites: 0,
              reviews: 0 
            }
          }
          modelData._count.favorites = data.favoriteCount
        }
        
        toast.success(data.isFavorited ? '已添加到收藏' : '已取消收藏')
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast.error('操作失败，请稍后重试')
    } finally {
      setIsTogglingFavorite(false)
    }
  }

  // 简化 handlePreviewLoad 函数
  const handlePreviewLoad = () => {
    setIsLoading(false)
    setRetryCount(0)
  }

  // 添加消息监听
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'modelLoadError') {
        handlePreviewError()
      } else if (event.data.type === 'modelLoadSuccess') {
        handlePreviewLoad()
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  // 简化 handlePreviewError 函数
  const handlePreviewError = () => {
    if (retryCount < maxRetries) {
      setRetryCount(prev => prev + 1)
      setIsLoading(true)
    } else {
      setIsLoading(false)
    }
  }

  // 在组件卸载时重置状态
  useEffect(() => {
    return () => {
      setIsLoading(true)
      setRetryCount(0)
    }
  }, [])

  // 优化获取模型数据的函数
  const fetchModelData = useCallback(async () => {
    // 如果已经加载过数据，且不是评论区打开/关闭的情况，就不重复加载
    if (hasLoadedData.current && !showReviews) return
    
    try {
      const response = await fetch(`/api/models/${model.id}`)
      if (!response.ok) throw new Error('获取模型数据失败')
      const data = await response.json()
      
      // 只有当数据真正发生变化时才更新状态
      if (JSON.stringify(data) !== JSON.stringify(modelDataRef.current)) {
        setModelData(data)
        modelDataRef.current = data
      }
      
      hasLoadedData.current = true
    } catch (error) {
      console.error('获取模型数据失败:', error)
    }
  }, [model.id, showReviews])

  // 优化打开详情的处理
  const handleShowDetails = useCallback(() => {
    setShowDetails(true)
    // 只在首次打开时获取数据
    if (!hasLoadedData.current) {
      fetchModelData()
    }
  }, [fetchModelData])

  // 优化评论区显示的处理
  const handleToggleReviews = useCallback(() => {
    setShowReviews(prev => !prev)
    // 只在打开评论区且没有最新数据时获取
    if (!showReviews && !hasLoadedData.current) {
      fetchModelData()
    }
  }, [fetchModelData, showReviews])

  // 处理评论提交后的更新
  const handleReviewSubmit = useCallback(async () => {
    // 评论提交后，强制刷新一次数据
    hasLoadedData.current = false
    await fetchModelData()
  }, [fetchModelData])

  // 组件卸载时重置状态
  useEffect(() => {
    return () => {
      hasLoadedData.current = false
    }
  }, [])

  // 使用 useEffect 在客户端更新时间
  useEffect(() => {
    // 初始化时间
    setTimeAgo(formatTimeDistance(model.createdAt))
    
    // 每分钟更新一次时间
    const timer = setInterval(() => {
      setTimeAgo(formatTimeDistance(model.createdAt))
    }, 60000) // 每分钟更新
    
    return () => clearInterval(timer)
  }, [model.createdAt])

  // 处理评论数量变化
  const handleReviewChange = useCallback((change: number) => {
    setModelData(prev => ({
      ...prev,
      _count: {
        ...prev._count,
        reviews: (prev._count?.reviews ?? 0) + change,
        favorites: prev._count?.favorites ?? 0
      }
    }))
    
    hasLoadedData.current = false
    fetchModelData()
  }, [])

  return (
    <div ref={cardRef} id={id}>
      {/* 只在非 modalOnly 时示卡片视图 */}
      {!modalOnly && (
        <div className={clsx(
          'bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden',
          'border border-gray-100 dark:border-gray-800',
          size === 'small' && 'text-sm hover:scale-[1.02]',
          size === 'medium' && 'text-base hover:scale-[1.01]',
          size === 'large' && 'hover:-translate-y-1'
        )}>
          <div className="relative group">
            {/* 收藏按钮 */}
            <div className={clsx(
              "absolute top-2 left-2 z-10 transition-opacity duration-200",
              size !== 'large' && "opacity-0 group-hover:opacity-100"
            )}>
              <button
                onClick={handleFavoriteClick}
                disabled={isTogglingFavorite}
                title="收藏"
                className={`flex items-center gap-1 px-2 py-1 rounded-full transition-all duration-200 ${
                  isFavorited 
                    ? 'text-white bg-pink-500 hover:bg-pink-600 shadow-lg' 
                    : 'text-gray-700 bg-white/90 hover:bg-white shadow backdrop-blur-sm'
                }`}
              >
                {isTogglingFavorite ? (
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <>
                    <svg 
                      className="w-5 h-5" 
                      fill={isFavorited ? 'currentColor' : 'none'} 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
                      />
                    </svg>
                    <span className="font-medium">
                      {typeof model._count?.favorites === 'number' ? model._count.favorites : 0}
                    </span>
                  </>
                )}
              </button>
            </div>

            {/* 状态图标 */}
            <div className={clsx(
              "absolute top-2 right-2 z-10 flex gap-1.5 transition-opacity duration-200",
              size !== 'large' && "opacity-0 group-hover:opacity-100"
            )}>
              {isOwner && (
                <span className="w-6 h-6 flex items-center justify-center bg-blue-500 bg-opacity-90 rounded-full shadow-md" title="我的模型">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
              )}
              {!model.isPublic && (
                <span className="w-6 h-6 flex items-center justify-center bg-gray-700 bg-opacity-90 rounded-full shadow-md" title="私有">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
              )}
            </div>

            {/* 预览图容器 */}
            <div className="aspect-square relative overflow-hidden w-full group">
              {/* 预览图遮罩 */}
              <div className={clsx(
                "absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 transition-opacity duration-300",
                "group-hover:opacity-100 pointer-events-none"
              )} />
              
              {/* 保持原有的预览内容 */}
              {isVisible ? (
                <div className="w-full h-full" style={{ pointerEvents: 'auto' }}>
                  <ModelPreview model={model} />
                </div>
              ) : (
                <div className="aspect-square bg-gray-50" />
              )}
            </div>
          </div>

          {/* 内容区域 */}
          <div className={clsx(
            'relative',
            size === 'small' && 'p-2 pb-3',
            size === 'medium' && 'p-3 pb-4',
            size === 'large' && 'p-4 pb-5'
          )}>
            {/* 标题和描述 */}
            <div className="space-y-1">
              <h3 className={clsx(
                'font-medium text-gray-900 dark:text-white truncate',
                size === 'small' && 'text-sm',
                size === 'medium' && 'text-base',
                size === 'large' && 'text-lg'
              )}>
                {model.name}
              </h3>
              {model.description && (
                <p className={clsx(
                  "text-gray-500 dark:text-gray-400 line-clamp-2",
                  size === 'small' && 'text-xs',
                  size === 'medium' && 'text-sm',
                  size === 'large' && 'text-base'
                )}>
                  {model.description}
                </p>
              )}
            </div>

            {/* 底部信息 */}
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={clsx(
                  "text-gray-500 dark:text-gray-400",
                  size === 'small' && 'text-xs',
                  size === 'medium' && 'text-sm',
                  size === 'large' && 'text-sm'
                )}>
                  {timeAgo || formatTimeDistance(model.createdAt)}
                </span>
                <span className={clsx(
                  "px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300",
                  size === 'small' && 'text-xs',
                  size === 'medium' && 'text-xs',
                  size === 'large' && 'text-sm'
                )}>
                  {formatFileType(model.format)}
                </span>
              </div>
              <button
                onClick={handleShowDetails}
                className={clsx(
                  "text-blue-500 hover:text-blue-600 font-medium transition-colors",
                  size === 'small' && 'text-xs',
                  size === 'medium' && 'text-sm',
                  size === 'large' && 'text-sm'
                )}
              >
                查看详情
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 详情模态框 */}
      {showDetails && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className={`bg-white rounded-2xl relative flex transition-all duration-300 ease-out ${
            showReviews ? 'w-[1400px]' : 'w-[900px]'
          }`}>
            {/* 主要内容区域 - 当显示评论时缩小主区域 */}
            <div className={`transition-all duration-300 ${
              showReviews ? 'w-[800px]' : 'flex-1'
            }`}>
              {/* 头部 */}
              <div className="p-6 border-b">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="space-y-3 max-w-2xl">
                        {/* 标题输入框和公开状态在一行 */}
                        <div className="flex items-center gap-4">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="flex-1 text-2xl font-bold px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="输入模型名称"
                          />
                          {/* 公开状态开关 */}
                          <div className="flex items-center gap-2 shrink-0">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isPublic}
                                onChange={(e) => setIsPublic(e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                            <span className="text-sm text-gray-600">公开</span>
                          </div>
                        </div>
                        {/* 描述输入框 */}
                        <textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                          placeholder="添加描述（可选）"
                          rows={2}
                        />
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-3">
                          <h2 className="text-2xl font-bold text-gray-900 truncate">
                            {modelData.name}
                          </h2>
                          {/* 状态图标 */}
                          {!modelData.isPublic && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                              私有
                            </span>
                          )}
                        </div>
                        {modelData.description && (
                          <p className="mt-2 text-gray-600">{modelData.description}</p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-start gap-2 shrink-0">
                    {isOwner && (
                      <>
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            {/* 保存按钮 */}
                            <button
                              onClick={handleUpdateModel}
                              disabled={isSaving}
                              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                            >
                              {isSaving ? (
                                <>
                                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  保存中
                                </>
                              ) : '保存'}
                            </button>
                            {/* 取消按钮 */}
                            <button
                              onClick={() => {
                                setIsEditing(false)
                                setEditName(model.name)
                                setIsPublic(model.isPublic)
                                setDescription(model.description || '')
                              }}
                              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg bg-white hover:bg-gray-50"
                            >
                              取消
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setIsEditing(true)}
                              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                              title="编辑"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={handleDeleteClick}
                              disabled={deletingId === model.id}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="删除"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </>
                    )}
                    <button
                      onClick={handleClose}
                      className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                      title="关闭"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* 内容区域 */}
              <div className="flex flex-col h-[calc(90vh-200px)]">
                {/* 预览区域 */}
                <div className="w-full h-full bg-gray-100 relative">
                  <iframe
                    src={model.format === 'dae' 
                      ? `/api/thumbnail/dae?model=${model.filePath}`
                      : `/api/thumbnail?model=${model.filePath}`
                    }
                    className="w-full h-full border-none"
                    title={model.name}
                    sandbox="allow-scripts allow-same-origin"
                  />
                </div>

                {/* 底部信息和操作栏 */}
                <div className="p-6 border-t bg-white">
                  <div className="flex flex-col gap-6">
                    {/* 基本信息 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        {/* 上传者信息 */}
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {model.user?.name || '未知用户'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {timeAgo || formatTimeDistance(model.createdAt)}
                            </div>
                          </div>
                        </div>

                        {/* 文件信息 */}
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>{formatFileType(model.format)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                            </svg>
                            <span>{(model.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                          </div>
                          {model._count?.favorites !== undefined && (
                            <div className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                              </svg>
                              <span>{model._count.favorites} 收藏</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 收藏按钮 */}
                      <button
                        onClick={handleFavoriteClick}
                        disabled={isTogglingFavorite}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                          isFavorited 
                            ? 'text-pink-600 bg-pink-50 hover:bg-pink-100' 
                            : 'text-gray-600 bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        {isTogglingFavorite ? (
                          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill={isFavorited ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        )}
                        <span>{isFavorited ? '已收藏' : '收藏'}</span>
                      </button>
                    </div>

                    {/* 操作按钮组 */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handlePreview}
                        disabled={isTransitioning}
                        className="flex-1 inline-flex items-center justify-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        在场景中打开
                      </button>
                      <button
                        onClick={handleDownload}
                        className="flex-1 inline-flex items-center justify-center px-4 py-2.5 border border-gray-300 text-sm font-medium rounded-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        下载模型
                      </button>
                      <button
                        onClick={handleToggleReviews}
                        className="flex-1 inline-flex items-center justify-center px-4 py-2.5 border border-gray-300 text-sm font-medium rounded-lg bg-white hover:bg-gray-50"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                        {(modelData?._count?.reviews ?? 0) > 0
                          ? `${modelData._count?.reviews} 条评论` 
                          : '还没有评论呢'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 评论侧边栏 */}
            {showReviews && (
              <div className="w-[600px] border-l bg-gray-50 flex flex-col">
                {/* 评论区头部 */}
                <div className="sticky top-0 z-10 flex items-center justify-between px-8 py-5 bg-white border-b">
                  <div>
                    <h3 className="text-xl font-medium">评价</h3>
                  </div>
                  <button
                    onClick={() => setShowReviews(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    title="关闭评论"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {/* 评论区内容 */}
                <div className="flex-1 overflow-y-auto px-8 py-6">
                  <ReviewSection 
                    modelId={model.id}
                    onReviewChange={handleReviewChange}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 转场动画 - 使用 portal 确保在最外层 */}
      {isTransitioning && (
        <div className="fixed inset-0 bg-blue-500 z-[99999] flex items-center justify-center animate-fadeIn">
          <div className="text-white text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
            </div>
            <h2 className="text-2xl font-bold">场景加载中</h2>
            <p className="mt-2 text-blue-100">正在准备 {model.name}</p>
          </div>
        </div>
      )}

      {/* 将确认对话框移到最外层，并增加 z-index */}
      <div className="relative z-[10000]">
        <ConfirmDialog
          isOpen={showConfirmDialog}
          onClose={() => setShowConfirmDialog(false)}
          onConfirm={handleConfirmDelete}
          title="删除模型"
          message={`确定要删除 "${model.name}" 吗？此操作无法撤销。`}
          confirmText="确认删除"
          type="danger"
        />
      </div>
    </div>
  )
} 