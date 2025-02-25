'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from '@/i18n/routing'
import { useSession } from 'next-auth/react'
import { toast } from 'react-hot-toast'
import { formatTimeDistance, formatFileType } from '@/utils/format'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import ReviewSection from '@/components/reviews/ReviewSection'
import { type ExtendedModel } from '@/types/model'
import clsx from 'clsx'
import Avatar from '@/components/ui/Avatar'
import { formatFileSize } from '@/lib/format'
import { useTranslations, useLocale } from 'next-intl'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { zip } from 'fflate'

interface ModelCardProps {
  model: ExtendedModel
  onDelete?: () => void
  defaultOpen?: boolean
  id?: string
  onClose?: () => void
  modalOnly?: boolean
  size?: 'large' | 'medium' | 'small'
}

function ModelPreview({ model, isVisible }: { model: ExtendedModel; isVisible: boolean }) {
  const t = useTranslations('ModelCard')
  const locale = useLocale()
  
  // 使用 react-query 管理预览加载状态
  const { isLoading, isError, refetch } = useQuery({
    queryKey: ['modelPreview', model.id],
    queryFn: async () => {
      // 这里可以添加预览资源预加载的逻辑
      return true
    },
    enabled: isVisible, // 只在组件可见时才加载
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000)
  })

  // 处理加载消息
  const handleMessage = useCallback((event: MessageEvent) => {
    if (event.data.type === 'modelLoadError') {
      refetch()
    }
  }, [refetch])

  useEffect(() => {
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [handleMessage])

  return (
    <div className="relative w-full h-full">
      {/* 加载状态 */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
            <p className="text-sm text-gray-600">{t('preview.loading')}</p>
          </div>
        </div>
      )}

      {/* 错误状态 */}
      {isError && (
        <div className="absolute inset-0 bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-gray-600 mb-2">{t('preview.error')}</p>
            <button
              onClick={() => refetch()}
              className="text-sm text-blue-500 hover:text-blue-600 font-medium"
            >
              {t('preview.retry')}
            </button>
          </div>
        </div>
      )}

      {/* iframe */}
      {isVisible && (
        <iframe
          src={`/api/thumbnail/${model.format}?model=${model.filePath}&locale=${locale}`}
          className={clsx(
            'w-full h-full border-none transition-opacity duration-300',
            (isLoading || isError) ? 'opacity-0' : 'opacity-100'
          )}
          sandbox="allow-scripts allow-same-origin"
          allow="autoplay"
          title={model.name}
        />
      )}
    </div>
  )
}

// 处理文件名，去除时间戳后缀
const cleanFileName = (fileName: string): string => {
  // 匹配以下模式：
  // 1. _数字.扩展名
  // 2. _数字 (没有扩展名的情况)
  return fileName.replace(/(_\d+)(?=\.\w+$|$)/, '');
};

export default function ModelCard({ model: initialModel, onDelete, defaultOpen, id, onClose, modalOnly, size = 'large' }: ModelCardProps) {
  const [showDetails, setShowDetails] = useState(defaultOpen || false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const router = useRouter()
  const { data: session } = useSession()
  const isOwner = session?.user?.id === initialModel.userId
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(initialModel.name)
  const [isPublic, setIsPublic] = useState(initialModel.isPublic)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [description, setDescription] = useState(initialModel.description || '')
  const [isFavorited, setIsFavorited] = useState(!!initialModel.isFavorited)
  const [showReviews, setShowReviews] = useState(false)
  const [timeAgo, setTimeAgo] = useState('')
  const [isVisible, setIsVisible] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const t = useTranslations('ModelCard')
  const locale = useLocale()
  const queryClient = useQueryClient()
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [totalSize, setTotalSize] = useState(0)

  const { data: model = initialModel, isError } = useQuery({
    queryKey: ['model', initialModel.id],
    queryFn: async () => {
      const response = await fetch(`/api/models/${initialModel.id}`)
      if (!response.ok) throw new Error(t('errors.fetchFailed'))
      return response.json()
    },
    initialData: initialModel,
    staleTime: 1000 * 30,
    retry: 2
  })

  // 监听错误
  useEffect(() => {
    if (isError) {
      console.error("获取模型数据失败")
      toast.error(t('errors.fetchFailed'))
    }
  }, [isError, t])

  // 收藏/取消收藏操作
  const { mutate: toggleFavorite, isPending: isTogglingFavorite } = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/models/${model.id}/favorite`, {
        method: 'POST'
      })
      if (!response.ok) throw new Error('操作失败')
      return response.json()
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['model', model.id] })
      const previousModel = queryClient.getQueryData(['model', model.id])
      
      queryClient.setQueryData(['model', model.id], (old: any) => ({
        ...old,
        isFavorited: !old.isFavorited,
        _count: {
          ...old._count,
          favorites: old.isFavorited ? old._count.favorites - 1 : old._count.favorites + 1
        }
      }))

      return { previousModel }
    },
    onError: (_err, _variables, context) => {
      if (context?.previousModel) {
        queryClient.setQueryData(['model', model.id], context.previousModel)
      }
      toast.error('操作失败')
    },
    onSuccess: (data) => {
      toast.success(data.isFavorited ? '已添加收藏' : '已取消收藏')
      queryClient.invalidateQueries({ queryKey: ['model'] })
    }
  })

  // 删除模型操作
  const { mutate: deleteModel, isPending: isDeleting } = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/models/${model.id}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error(t('errors.deleteFailed'))
      return response.json()
    },
    onSuccess: () => {
      toast.success(t('success.deleteSuccess'))
      onDelete?.()
      handleClose()
      queryClient.invalidateQueries({ queryKey: ['models'] }) // 更新模型列表
    },
    onError: () => {
      toast.error(t('errors.deleteFailed'))
    }
  })

  // 更新模型操作
  const { mutate: updateModel, isPending: isSavingModel } = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/models/${model.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          isPublic,
          description
        })
      })
      if (!response.ok) throw new Error(t('errors.updateFailed'))
      return response.json()
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['model', model.id], data)
      toast.success(t('success.updateSuccess'))
      setIsEditing(false)
      queryClient.invalidateQueries({ queryKey: ['models'] }) // 更新模型列表
    },
    onError: () => {
      toast.error(t('errors.updateFailed'))
    }
  })

  // 客户端打包下载操作  
const { mutate: downloadModel, isPending: isDownloading } = useMutation({
  mutationFn: async () => {
    try {
      // 1. 获取文件列表
      const response = await fetch(`/api/models/${model.id}/download`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || t('errors.downloadFailed'));
      }
      
      const { files, model: modelInfo } = await response.json() as {
        files: Array<{ name: string; url: string; size: number }>;
        model: { name: string; format: string };
      };
      
      setTotalSize(files.reduce((acc, file) => acc + file.size, 0));
      
      // 单文件下载
      if (files.length === 1) {
        await downloadSingleFile(files[0]);
      } else {
        // 多文件压缩下载
        await downloadMultipleFiles(files, modelInfo);
      }
      
      // 重置进度
      resetDownloadState();
      return true;
    } catch (error) {
      resetDownloadState();
      throw error;
    }
  },
  onSuccess: () => {
    toast.success(t('success.downloadSuccess'));
  },
  onError: (error) => {
    console.error("下载失败", error);
    toast.error(error instanceof Error ? error.message : t('errors.downloadFailed'));
  }
});

// 下载单个文件的辅助函数
const downloadSingleFile = async (file: { name: string; url: string; size: number }) => {
  const blob = await fetchFileWithProgress(file.url, file.size, (downloaded) => {
    // 确保进度不会超过100%
    const progress = Math.min(Math.round((downloaded / file.size) * 100), 100);
    setDownloadProgress(progress);
  });
  
  // 使用清理后的文件名
  triggerDownload(blob, cleanFileName(file.name));
};

// 下载多个文件的辅助函数
const downloadMultipleFiles = async (
  files: Array<{ name: string; url: string; size: number }>,
  modelInfo: { name: string; format: string }
) => {
  const totalSize = files.reduce((acc, file) => acc + file.size, 0);
  let downloadedSizes = new Map<string, number>();
  
  // 更新总体进度的函数
  const updateOverallProgress = () => {
    const totalDownloaded = Array.from(downloadedSizes.values()).reduce((acc, size) => acc + size, 0);
    const progress = Math.round((totalDownloaded / totalSize) * 100);
    setDownloadProgress(Math.min(progress, 99));
  };

  // 创建一个对象来存储所有文件数据
  const zipObj: Record<string, Uint8Array> = {};

  // 并行下载所有文件
  await Promise.all(files.map(async (file) => {
    try {
      const blob = await fetchFileWithProgress(
        file.url, 
        file.size,
        (downloaded) => {
          downloadedSizes.set(file.name, downloaded);
          updateOverallProgress();
        }
      );
      
      // 将 blob 转换为 Uint8Array
      const arrayBuffer = await blob.arrayBuffer();
      zipObj[cleanFileName(file.name)] = new Uint8Array(arrayBuffer);
    } catch (error) {
      console.error(`下载文件 ${file.name} 失败:`, error);
      throw error;
    }
  }));
  
  setDownloadProgress(99);

  // 使用 Promise 包装 zip 操作
  const zipBlob = await new Promise<Blob>((resolve, reject) => {
    // 使用 worker 进行压缩
    zip(zipObj, {
      level: 6,
      consume: true, // 边压缩边释放内存
      mem: 9, // 使用最大内存以提高性能
    }, (err, data) => {
      if (err) {
        reject(err);
      } else {
        setDownloadProgress(100);
        resolve(new Blob([data], { type: 'application/zip' }));
      }
    });
  });

  // 使用清理后的模型名称作为zip文件名
  triggerDownload(zipBlob, `${cleanFileName(modelInfo.name)}.zip`);
};

// 带进度的文件获取
const fetchFileWithProgress = async (
  url: string,
  fileSize: number,
  onProgress: (downloaded: number) => void
): Promise<Blob> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download from ${url}`);
  
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Failed to get reader');
  
  const chunks: Uint8Array[] = [];
  let receivedLength = 0;
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    chunks.push(value);
    receivedLength += value.length;
    // 确保不会发送超过文件大小的进度
    onProgress(Math.min(receivedLength, fileSize));
  }
  
  return new Blob(chunks);
};

// 触发下载
const triggerDownload = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.setAttribute('download', filename); // 支持 IDM 检测
  
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

// 重置下载状态
const resetDownloadState = () => {
  setDownloadProgress(0);
  setTotalSize(0);
};

  // 使用 useEffect 监听卡片可见性
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
    // 先关闭模态框
    setShowDetails(false)
    // 然后延迟跳转
    setTimeout(() => {
      router.push(`/preview/${model.id}`)
    }, 500)
  }

  // 处理更新模型信息
  const handleUpdateModel = () => {
    updateModel()
  }

  // 处理删除
  const handleDeleteClick = () => {
    setShowConfirmDialog(true)
  }

  const handleConfirmDelete = () => {
    setShowConfirmDialog(false)
    deleteModel()
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
      toast.error(t('errors.loginRequired'))
      router.push('/login')
      return
    }
    toggleFavorite()
  }

  // 使用 useEffect 在客户端更新时间
  useEffect(() => {
    // 初始化时间
    setTimeAgo(formatTimeDistance(model.createdAt, locale))
    
    // 每分钟更新一次时间
    const timer = setInterval(() => {
      setTimeAgo(formatTimeDistance(model.createdAt, locale))
    }, 60000) // 每分钟更新
    
    return () => clearInterval(timer)
  }, [model.createdAt, locale])

  // 修改 handleReviewChange 回调
  const handleReviewChange = useCallback((change: number) => {
    queryClient.setQueryData(['model', model.id], (oldData: any) => ({
      ...oldData,
      _count: {
        ...oldData._count,
        reviews: (oldData._count?.reviews ?? 0) + change,
        favorites: oldData._count?.favorites ?? 0
      }
    }))
    
    // 使数据失效，触发重新获取
    queryClient.invalidateQueries({ queryKey: ['model', model.id] })
  }, [model.id, queryClient])

  // 修改下载按钮部分
  const downloadButton = (
    <button
      onClick={() => downloadModel()}
      disabled={isDownloading}
      className="flex-1 inline-flex items-center justify-center px-4 py-2.5 border border-gray-300 text-sm font-medium rounded-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
    >
      {isDownloading ? (
        <>
          <svg className="animate-spin w-5 h-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="flex items-center gap-2">
            {t('actions.downloading')} {downloadProgress > 0 && `(${downloadProgress}%)`}
            {totalSize > 0 && <span className="text-xs text-gray-500">
              {formatFileSize(totalSize)}
            </span>}
          </span>
        </>
      ) : (
        <>
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {t('actions.downloadModel')}
        </>
      )}
    </button>
  )

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
                title={isFavorited ? t('actions.favorited') : t('actions.favorite')}
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
                <span className="w-6 h-6 flex items-center justify-center bg-blue-500 bg-opacity-90 rounded-full shadow-md" title={t('status.myModel')}>
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
              )}
              {!model.isPublic && (
                <span className="w-6 h-6 flex items-center justify-center bg-gray-700 bg-opacity-90 rounded-full shadow-md" title={t('status.private')}>
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
              <div className="w-full h-full" style={{ pointerEvents: 'auto' }}>
                <ModelPreview model={model} isVisible={isVisible} />
              </div>
            </div>
          </div>

          {/* 内容区域 */}
          <div className={clsx(
            'relative',
            size === 'small' && 'p-2 pb-3',
            size === 'medium' && 'p-3 pb-4',
            size === 'large' && 'p-4 pb-5'
          )}>
            {/* 题和描述 */}
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
                  {timeAgo || formatTimeDistance(model.createdAt, locale)}
                </span>
                <span className={clsx(
                  "px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300",
                  size === 'small' && 'text-xs',
                  size === 'medium' && 'text-xs',
                  size === 'large' && 'text-sm'
                )}>
                  {t('fileInfo.format')}: {formatFileType(model.format)}
                </span>
              </div>
              <button
                onClick={() => setShowDetails(true)}
                className={clsx(
                  "text-blue-500 hover:text-blue-600 font-medium transition-colors",
                  size === 'small' && 'text-xs',
                  size === 'medium' && 'text-sm',
                  size === 'large' && 'text-sm'
                )}
              >
                {t('actions.viewDetails')}
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
                            placeholder={t('form.namePlaceholder')}
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
                            <span className="text-sm text-gray-600">{t('form.public')}</span>
                          </div>
                        </div>
                        {/* 描述输入框 */}
                        <textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                          placeholder={t('form.descriptionPlaceholder')}
                          rows={2}
                        />
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-3">
                          <h2 className="text-2xl font-bold text-gray-900 truncate">
                            {model.name}
                          </h2>
                          {/* 状态图标 */}
                          {!model.isPublic && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                              {t('status.private')}
                            </span>
                          )}
                        </div>
                        {model.description && (
                          <p className="mt-2 text-gray-600">{model.description}</p>
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
                              disabled={isSavingModel}
                              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              {isSavingModel ? (
                                <>
                                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  {t('actions.saving')}
                                </>
                              ) : t('actions.save')}
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
                              {t('actions.cancel')}
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setIsEditing(true)}
                              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                              title={t('actions.edit')}
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={handleDeleteClick}
                              disabled={isDeleting}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title={t('actions.delete')}
                            >
                              {isDeleting ? (
                                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              ) : (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              )}
                            </button>
                          </div>
                        )}
                      </>
                    )}
                    <button
                      onClick={handleClose}
                      className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                      title={t('actions.close')}
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
                  <ModelPreview model={model} isVisible={true} />
                </div>

                {/* 底部信息和操作栏 */}
                <div className="p-6 border-t bg-white">
                  <div className="flex flex-col gap-6">
                    {/* 基本信息 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        {/* 上传者信息 */}
                        <div className="flex items-center gap-2">
                          <Avatar user={model.user} size="md" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {model.user?.name || t('info.unknownUser')}
                            </div>
                            <div className="text-xs text-gray-500">
                              {timeAgo || formatTimeDistance(model.createdAt, locale)}
                            </div>
                          </div>
                        </div>

                        {/* 文件信息 */}
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>{t('fileInfo.format')}: {formatFileType(model.format)}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                            </svg>
                            <span>{t('fileInfo.size')}: {formatFileSize((model.fileSize || 0) + (model.texturesSize || 0))}</span>
                          </div>
                          {model._count?.favorites !== undefined && (
                            <div className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                              </svg>
                              <span>{model._count.favorites} {t('info.favorites')}</span>
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
                        <span>{isFavorited ? t('actions.favorited') : t('actions.favorite')}</span>
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
                        {t('actions.openInScene')}
                      </button>
                      {downloadButton}
                      <button
                        onClick={() => setShowReviews(prev => !prev)}
                        className="flex-1 inline-flex items-center justify-center px-4 py-2.5 border border-gray-300 text-sm font-medium rounded-lg bg-white hover:bg-gray-50"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                        {(model._count?.reviews ?? 0) > 0
                          ? `${model._count?.reviews} ${t('actions.comments')}` 
                          : t('actions.noComments')}
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
                    <h3 className="text-xl font-medium">{t('info.comments')}</h3>
                  </div>
                  <button
                    onClick={() => setShowReviews(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    title={t('actions.closeComments')}
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
            <h2 className="text-2xl font-bold">{t('loading.title')}</h2>
            <p className="mt-2 text-blue-100">{t('loading.preparing')} {model.name}</p>
          </div>
        </div>
      )}

      {/* 将确认对话框移到最外层，并增加 z-index */}
      <div className="relative z-[10000]">
        <ConfirmDialog
          isOpen={showConfirmDialog}
          onClose={() => setShowConfirmDialog(false)}
          onConfirm={handleConfirmDelete}
          title={t('dialog.deleteTitle')}
          message={t('dialog.deleteMessage', { name: model.name })}
          confirmText={t('dialog.deleteConfirm')}
          type="danger"
        />
      </div>
    </div>
  )
} 