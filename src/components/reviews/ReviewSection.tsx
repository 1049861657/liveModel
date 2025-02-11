'use client'

import { useState, useEffect, memo, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'motion/react'
import { toast } from 'react-hot-toast'
import { StarIcon } from '@heroicons/react/24/solid'
import { StarIcon as StarOutlineIcon } from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import { zhCN, enUS, ja } from 'date-fns/locale'; 
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { useRouter } from '@/i18n/routing'
import Avatar from '@/components/ui/Avatar'
import { useTranslations, useLocale } from 'next-intl'
import { useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'

interface Review {
  id: string
  content: string
  rating: number
  createdAt: Date
  user: {
    id: string
    name: string | null
    email: string
  }
  replies: Reply[]
  _count: {
    likedBy: number
  }
  isLiked?: boolean
}

interface Reply {
  id: string
  content: string
  createdAt: Date
  user: {
    id: string
    name: string | null
    email: string
  }
}

interface ReviewSectionProps {
  modelId: string
  onReviewChange?: (change: number) => void
}

interface ReviewData {
  reviews: Review[]
  pages: number
}

// 将 RatingStars 组件独立出来，使用自己的状态
const RatingStars = memo(({ rating, onChange }: { rating: number; onChange: (value: number) => void }) => {
  const [hoveredStar, setHoveredStar] = useState(0)
  const t = useTranslations('ReviewSection')

  return (
    <div className="flex items-center space-x-2">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHoveredStar(star)}
            onMouseLeave={() => setHoveredStar(0)}
            className="p-1 focus:outline-none"
          >
            {star <= (hoveredStar || rating) ? (
              <StarIcon className="w-6 h-6 text-yellow-400" />
            ) : (
              <StarOutlineIcon className="w-6 h-6 text-gray-300" />
            )}
          </button>
        ))}
      </div>
      <span className="text-sm text-gray-500">
        {rating ? t('rating.stars', { count: rating }) : t('rating.placeholder')}
      </span>
    </div>
  )
})

// 给组件添加显示名称
RatingStars.displayName = 'RatingStars'

// 将评分表单抽离为独立组件
const ReviewForm = memo(({ onSubmit, loading, onCancel }: { 
  onSubmit: (content: string, rating: number) => Promise<void>
  loading: boolean
  onCancel?: () => void
}) => {
  const [rating, setRating] = useState(0)
  const [content, setContent] = useState('')
  const t = useTranslations('ReviewSection')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(content, rating)
    setContent('')
    setRating(0)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 shadow-sm space-y-4">
      <RatingStars 
        rating={rating} 
        onChange={setRating}
      />

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={t('placeholder')}
        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all resize-none"
        rows={4}
        required
      />

      <div className="flex justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          >
            {t('cancel')}
          </button>
        )}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={loading || !rating}
          className={`px-6 py-2 rounded-lg text-white font-medium
            ${loading || !rating 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-indigo-600 hover:bg-indigo-700'
            } transition-colors`}
        >
          {loading ? t('submitting') : t('submit')}
        </motion.button>
      </div>
    </form>
  )
})

ReviewForm.displayName = 'ReviewForm'

// 1. 首先定义一个独立的回复框组件
const ReplyBox = memo(({ 
  reviewId, 
  onSubmit, 
  onCancel 
}: { 
  reviewId: string
  onSubmit: (content: string) => Promise<void>
  onCancel: () => void
}) => {
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const t = useTranslations('ReviewSection')

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error(t('errors.submitFailed'))
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(content)
      setContent('')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="space-y-2"
    >
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={t('replyPlaceholder')}
        className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all resize-none"
        rows={3}
      />
      <div className="flex justify-end space-x-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          disabled={isSubmitting}
        >
          {t('replyCancel')}
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="px-4 py-2 text-sm text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
        >
          {isSubmitting ? t('replySubmitting') : t('replySubmit')}
        </button>
      </div>
    </motion.div>
  )
})

ReplyBox.displayName = 'ReplyBox'

// 添加 API 函数
const reviewApi = {
  getReviews: async (modelId: string, page: number, sort: string) => {
    const response = await fetch(`/api/models/${modelId}/reviews?page=${page}&sort=${sort}`)
    if (!response.ok) throw new Error('Failed to fetch reviews')
    return response.json()
  },

  submitReview: async (modelId: string, data: { content: string; rating: number }) => {
    const response = await fetch(`/api/models/${modelId}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error('Failed to submit review')
    return response.json()
  },

  deleteReview: async (modelId: string, reviewId: string) => {
    const response = await fetch(`/api/models/${modelId}/reviews/${reviewId}`, {
      method: 'DELETE',
    })
    if (!response.ok) throw new Error('Failed to delete review')
    return response.json()
  },

  likeReview: async (modelId: string, reviewId: string) => {
    const response = await fetch(`/api/models/${modelId}/reviews/${reviewId}/like`, {
      method: 'POST',
    })
    if (!response.ok) throw new Error('Failed to like review')
    return response.json()
  },

  submitReply: async (modelId: string, reviewId: string, content: string) => {
    const response = await fetch(`/api/models/${modelId}/reviews/${reviewId}/replies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    if (!response.ok) throw new Error('Failed to submit reply')
    return response.json()
  },

  deleteReply: async (modelId: string, reviewId: string, replyId: string) => {
    const response = await fetch(`/api/models/${modelId}/reviews/${reviewId}/replies/${replyId}`, {
      method: 'DELETE',
    })
    if (!response.ok) throw new Error('Failed to delete reply')
    return response.json()
  },
}

export default function ReviewSection({ modelId, onReviewChange }: ReviewSectionProps) {
  const { data: session } = useSession()
  const [sortBy, setSortBy] = useState<'latest' | 'rating' | 'likes'>('latest')
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'review' | 'reply'
    reviewId: string
    replyId?: string
  } | null>(null)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const router = useRouter()
  const t = useTranslations('ReviewSection')
  const locale = useLocale()
  const dateLocale = locale === 'zh' ? zhCN : (locale === 'ja' ? ja : enUS)
  const queryClient = useQueryClient()
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isLiking, setIsLiking] = useState<string | null>(null)
  const reviewListRef = useRef<HTMLDivElement>(null)

  // 使用 useInfiniteQuery 替代 useQuery
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: loading
  } = useInfiniteQuery<ReviewData, Error>({
    queryKey: ['reviews', modelId, sortBy] as const,
    queryFn: ({ pageParam = 1 }) => reviewApi.getReviews(modelId, pageParam as number, sortBy),
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.pages > allPages.length ? allPages.length + 1 : undefined
    },
    initialPageParam: 1
  })

  // 合并所有页面的评论
  const reviews = data?.pages.flatMap(page => page.reviews) ?? []

  // 监听滚动到底部
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { threshold: 0.5 }
    )

    const reviewList = reviewListRef.current
    if (reviewList) {
      observer.observe(reviewList)
    }

    return () => {
      if (reviewList) {
        observer.unobserve(reviewList)
      }
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  // 提交评论
  const submitReviewMutation = useMutation({
    mutationFn: (data: { content: string; rating: number }) => 
      reviewApi.submitReview(modelId, data),
    onSuccess: (newReview) => {
      queryClient.setQueryData(['reviews', modelId, sortBy], (old: any) => {
        if (!old?.pages?.length) return old
        return {
          ...old,
          pages: [
            {
              ...old.pages[0],
              reviews: [newReview, ...old.pages[0].reviews]
            },
            ...old.pages.slice(1)
          ]
        }
      })
      if (onReviewChange) onReviewChange(1)
      toast.success(t('success.reviewSubmitted'))
      setShowReviewForm(false)
    },
    onError: () => {
      toast.error(t('errors.reviewFailed'))
    },
  })

  // 删除评论
  const deleteReviewMutation = useMutation({
    mutationFn: (reviewId: string) => {
      setIsDeleting(reviewId)
      return reviewApi.deleteReview(modelId, reviewId)
    },
    onSuccess: (_, reviewId) => {
      queryClient.setQueryData(['reviews', modelId, sortBy], (old: any) => {
        if (!old?.pages?.length) return old
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            reviews: page.reviews.filter((review: Review) => review.id !== reviewId)
          }))
        }
      })
      if (onReviewChange) onReviewChange(-1)
      toast.success(t('success.deleted'))
      setShowDeleteConfirm(false)
      setDeleteTarget(null)
      setIsDeleting(null)
    },
    onError: () => {
      toast.error(t('errors.deleteFailed'))
      setShowDeleteConfirm(false)
      setDeleteTarget(null)
      setIsDeleting(null)
    },
  })

  // 点赞评论
  const likeReviewMutation = useMutation({
    mutationFn: (reviewId: string) => {
      setIsLiking(reviewId)
      return reviewApi.likeReview(modelId, reviewId)
    },
    onMutate: async (reviewId) => {
      await queryClient.cancelQueries({
        queryKey: ['reviews', modelId, sortBy]
      })
      const previousReviews = queryClient.getQueryData(['reviews', modelId, sortBy])
      
      queryClient.setQueryData(['reviews', modelId, sortBy], (old: any) => {
        if (!old?.pages?.length) return old
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            reviews: page.reviews.map((review: Review) => {
              if (review.id === reviewId) {
                const newIsLiked = !review.isLiked
                return {
                  ...review,
                  isLiked: newIsLiked,
                  _count: {
                    ...review._count,
                    likedBy: review.isLiked ? review._count.likedBy - 1 : review._count.likedBy + 1
                  }
                }
              }
              return review
            })
          }))
        }
      })

      return { previousReviews }
    },
    onError: (_, __, context: any) => {
      queryClient.setQueryData(['reviews', modelId, sortBy], context.previousReviews)
      toast.error(t('errors.likeFailed'))
      setIsLiking(null)
    },
    onSuccess: (data) => {
      toast.success(data.isLiked ? t('success.submitted') : t('success.deleted'))
      setIsLiking(null)
    },
  })

  // 提交回复
  const submitReplyMutation = useMutation({
    mutationFn: ({ reviewId, content }: { reviewId: string; content: string }) => {
      setActiveReplyId(null)
      return reviewApi.submitReply(modelId, reviewId, content)
    },
    onSuccess: (newReply, { reviewId }) => {
      queryClient.setQueryData(['reviews', modelId, sortBy], (old: any) => {
        if (!old?.pages?.length) return old
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            reviews: page.reviews.map((review: Review) => {
              if (review.id === reviewId) {
                return {
                  ...review,
                  replies: [...review.replies, newReply]
                }
              }
              return review
            })
          }))
        }
      })
      toast.success(t('success.replySubmitted'))
    },
    onError: () => {
      toast.error(t('errors.replyFailed'))
      setActiveReplyId(null)
    },
  })

  // 删除回复
  const deleteReplyMutation = useMutation({
    mutationFn: ({ reviewId, replyId }: { reviewId: string; replyId: string }) => {
      setIsDeleting(replyId)
      return reviewApi.deleteReply(modelId, reviewId, replyId)
    },
    onSuccess: (_, { reviewId, replyId }) => {
      queryClient.setQueryData(['reviews', modelId, sortBy], (old: any) => {
        if (!old?.pages?.length) return old
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            reviews: page.reviews.map((review: Review) => {
              if (review.id === reviewId) {
                return {
                  ...review,
                  replies: review.replies.filter(reply => reply.id !== replyId)
                }
              }
              return review
            })
          }))
        }
      })
      toast.success(t('success.deleted'))
      setShowDeleteConfirm(false)
      setDeleteTarget(null)
      setIsDeleting(null)
    },
    onError: () => {
      toast.error(t('errors.deleteFailed'))
      setShowDeleteConfirm(false)
      setDeleteTarget(null)
      setIsDeleting(null)
    },
  })

  const handleReviewSubmit = async (content: string, rating: number) => {
    if (!session) {
      toast.error(t('errors.loginRequired'))
      router.push('/login')
      return
    }

    if (!rating) {
      toast.error(t('errors.ratingRequired'))
      return
    }

    if (!content.trim()) {
      toast.error(t('errors.emptyContent'))
      return
    }

    submitReviewMutation.mutate({ content, rating })
  }

  const handleLike = async (reviewId: string) => {
    if (!session) {
      toast.error(t('errors.loginRequired'))
      return
    }
    likeReviewMutation.mutate(reviewId)
  }

  const handleReplySubmit = async (reviewId: string, content: string) => {
    if (!session) {
      toast.error(t('errors.loginRequired'))
      router.push('/login')
      return
    }

    if (!content.trim()) {
      toast.error(t('errors.emptyContent'))
      return
    }

    submitReplyMutation.mutate({ reviewId, content })
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return

    if (deleteTarget.type === 'review') {
      deleteReviewMutation.mutate(deleteTarget.reviewId)
    } else if (deleteTarget.replyId) {
      deleteReplyMutation.mutate({
        reviewId: deleteTarget.reviewId,
        replyId: deleteTarget.replyId,
      })
    }
  }

  // 渲染评价卡片
  const ReviewCard = ({ review }: { review: Review }) => {
    const dateFormat = locale === 'zh' ? 'yyyy年MM月dd日 HH:mm:ss' : (locale === 'ja' ? 'yyyy/MM/dd HH:mm:ss' : 'MMM d, yyyy HH:mm:ss');
    const replyDateFormat = locale === 'zh' ? 'yyyy年MM月dd日 HH:mm:ss' : (locale === 'ja' ? 'yyyy/MM/dd HH:mm:ss' : 'MMM d, yyyy HH:mm:ss');

    const handleDeleteReview = (reviewId: string) => {
      setDeleteTarget({ type: 'review', reviewId })
      setShowDeleteConfirm(true)
    }

    const handleDeleteReply = (reviewId: string, replyId: string) => {
      setDeleteTarget({ type: 'reply', reviewId, replyId })
      setShowDeleteConfirm(true)
    }

    const handleReplyClick = (reviewId: string) => {
      if (!session) {
        toast.error(t('errors.loginRequired'))
        router.push('/login')
        return
      }
      setActiveReplyId(activeReplyId === reviewId ? null : reviewId)
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="group bg-white rounded-xl p-6 shadow-sm space-y-4"
      >
        {/* 评价头部 */}
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-3">
            <Avatar user={review.user} size="md" />
            <div>
              <p className="font-medium text-gray-900">{review.user.name || t('info.unknownUser')}</p>
              <p className="text-sm text-gray-500">
                {format(new Date(review.createdAt), dateFormat, { locale: dateLocale })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center space-x-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <StarIcon
                  key={i}
                  className={`w-5 h-5 ${
                    i < review.rating ? 'text-yellow-400' : 'text-gray-200'
                  }`}
                />
              ))}
            </div>
            
            {/* 修改删除按钮样式 */}
            {session?.user?.id === review.user.id && (
              <button
                onClick={() => handleDeleteReview(review.id)}
                disabled={isDeleting === review.id}
                className={`opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all ${
                  isDeleting === review.id
                    ? 'bg-red-50 cursor-wait'
                    : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                }`}
                title={t('titles.deleteReview')}
              >
                {isDeleting === review.id ? (
                  <svg className="animate-spin w-4 h-4 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>

        {/* 评价内容 */}
        <p className="text-gray-700">{review.content}</p>

        {/* 操作按钮 */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => handleLike(review.id)}
            disabled={isLiking === review.id}
            className={`flex items-center gap-1 text-sm transition-all ${
              isLiking === review.id
                ? 'opacity-50 cursor-wait'
                : review.isLiked 
                  ? 'text-blue-500' 
                  : 'text-gray-500 hover:text-blue-500'
            }`}
          >
            {isLiking === review.id ? (
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg 
                className={`w-5 h-5 transition-transform ${review.isLiked ? 'scale-110' : ''}`} 
                fill={review.isLiked ? "currentColor" : "none"} 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" 
                />
              </svg>
            )}
            <span className={review.isLiked ? 'font-medium' : ''}>
              {review._count?.likedBy || 0}
            </span>
          </button>
          <button
            onClick={() => handleReplyClick(review.id)}
            className="flex items-center space-x-1 text-gray-500 hover:text-blue-500 transition-colors"
            title={t('titles.reply')}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            <span>{t('reply')}</span>
          </button>
        </div>

        {/* 回复框 */}
        <AnimatePresence>
          {activeReplyId === review.id && (
            <ReplyBox
              reviewId={review.id}
              onSubmit={async (content) => {
                await handleReplySubmit(review.id, content)
              }}
              onCancel={() => setActiveReplyId(null)}
            />
          )}
        </AnimatePresence>

        {/* 回复列表 */}
        {review.replies?.length > 0 && (
          <div className="mt-4 space-y-3 pl-4 border-l-2 border-gray-100">
            {review.replies.map((reply) => (
              <div key={reply.id} className="group relative space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">
                      {reply.user.name || t('info.unknownUser')}
                    </span>
                    <span className="text-sm text-gray-500">
                      {format(new Date(reply.createdAt), replyDateFormat, { locale: dateLocale })}
                    </span>
                  </div>
                  
                  {/* 删除回复按钮 */}
                  {session?.user?.id === reply.user.id && (
                    <button
                      onClick={() => handleDeleteReply(review.id, reply.id)}
                      disabled={isDeleting === reply.id}
                      className={`opacity-0 group-hover:opacity-100 p-1 rounded transition-all ${
                        isDeleting === reply.id
                          ? 'bg-red-50 cursor-wait'
                          : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                      }`}
                      title={t('titles.deleteReply')}
                    >
                      {isDeleting === reply.id ? (
                        <svg className="animate-spin w-4 h-4 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
                <p className="text-gray-700">{reply.content}</p>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] max-h-[800px]">
      {/* 评价表单 - 修改这部分 */}
      {!loading && (
        <div className="flex-shrink-0 p-4">
          {showReviewForm ? (
            <div className="relative">
              <button
                onClick={() => setShowReviewForm(false)}
                className="absolute top-2 right-2 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                title={t('titles.closeForm')}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <ReviewForm 
                onSubmit={async (content, rating) => {
                  await handleReviewSubmit(content, rating)
                  setShowReviewForm(false)
                }}
                loading={loading}
                onCancel={() => setShowReviewForm(false)}
              />
            </div>
          ) : (
            <button
              onClick={() => {
                if (!session) {
                  toast.error(t('errors.loginRequired'))
                  router.push('/login')
                  return
                }
                setShowReviewForm(true)
              }}
              className="w-full px-6 py-3 text-center rounded-lg border-2 border-dashed border-gray-300 text-gray-600 hover:border-blue-500 hover:text-blue-500 transition-colors"
            >
              {t('writeReview')}
            </button>
          )}
        </div>
      )}

      {/* 筛选和排序 */}
      <div className="flex justify-between items-center px-4 py-3 flex-shrink-0 border-t border-b bg-gray-50/80">
        <div className="flex items-center gap-4">
          <h3 className="font-medium text-gray-900">{t('title')}</h3>
          <select
            value={sortBy}
            onChange={(e) => {
              const newSortBy = e.target.value as typeof sortBy
              setSortBy(newSortBy)
              queryClient.invalidateQueries({
                queryKey: ['reviews', modelId]
              })
            }}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white"
          >
            <option value="latest">{t('sort.latest')}</option>
            <option value="rating">{t('sort.rating')}</option>
            <option value="likes">{t('sort.likes')}</option>
          </select>
        </div>
      </div>

      {/* 加载状态 */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
          <span className="ml-2 text-gray-500">{t('loading.fetching')}</span>
        </div>
      )}

      {/* 评价列表 */}
      {!loading && (
        <div className="flex-1 overflow-y-auto px-4">
          <div className="py-4 space-y-4" ref={reviewListRef}>
            <AnimatePresence>
              {reviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </AnimatePresence>

            {reviews.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                <p>{t('noReviews')}</p>
              </div>
            )}

            {/* 加载更多的loading状态 */}
            {isFetchingNextPage && (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 确认对话框 */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false)
          setDeleteTarget(null)
        }}
        onConfirm={handleConfirmDelete}
        title={t('confirmDelete.title')}
        message={t('confirmDelete.message', { 
          type: deleteTarget?.type === 'review' ? t('types.review') : t('types.reply')
        })}
        confirmText={t('confirmDelete.confirm')}
        type="danger"
      />
    </div>
  )
} 
