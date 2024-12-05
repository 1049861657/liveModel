'use client'

import { useState, useEffect, memo } from 'react'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-hot-toast'
import { StarIcon } from '@heroicons/react/24/solid'
import { StarIcon as StarOutlineIcon } from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { useRouter } from 'next/navigation'

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

// 将 RatingStars 组件独立出来，使用自己的状态
const RatingStars = memo(({ rating, onChange }: { rating: number; onChange: (value: number) => void }) => {
  const [hoveredStar, setHoveredStar] = useState(0)

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
        {rating ? `${rating} 星` : '请评分'}
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
  onCancel?: () => void  // 添加取消回调
}) => {
  const [rating, setRating] = useState(0)
  const [content, setContent] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(content, rating)
    // 重置表单
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
        placeholder="分享你的使用体验..."
        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all resize-none"
        rows={4}
        required
      />

      <div className="flex justify-end gap-2">
        {onCancel && (  // 只在提供 onCancel 时显示取消按钮
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          >
            取消
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
          发表评论
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

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error('回复内容不能为空')
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(content)
      setContent('')  // 成功后清空内容
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
        placeholder="写下你的回复..."
        className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all resize-none"
        rows={3}
      />
      <div className="flex justify-end space-x-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          disabled={isSubmitting}
        >
          取消
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="px-4 py-2 text-sm text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
        >
          {isSubmitting ? '发送中...' : '发表回复'}
        </button>
      </div>
    </motion.div>
  )
})

ReplyBox.displayName = 'ReplyBox'

export default function ReviewSection({ modelId, onReviewChange }: ReviewSectionProps) {
  const { data: session } = useSession()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [sortBy, setSortBy] = useState<'latest' | 'rating' | 'likes'>('latest')
  const [replyStates, setReplyStates] = useState<{
    [key: string]: {
      isReplying: boolean;
      content: string;
    }
  }>({})
  const [isLiking, setIsLiking] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'review' | 'reply'
    reviewId: string
    replyId?: string
  } | null>(null)
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [showReviewForm, setShowReviewForm] = useState(false)  // 添加评论框显示状态
  const router = useRouter()

  // 重命名为 fetchReviews 并提升到组件级别
  const fetchReviews = async (pageNum = page, sort = sortBy) => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/models/${modelId}/reviews?page=${pageNum}&sort=${sort}`
      )
      if (!response.ok) throw new Error('获取评价失败')
      const data = await response.json()
      setReviews(data.reviews)
      setTotalPages(data.pages)
    } catch (error) {
      console.error('获取评价失败:', error)
      toast.error('获取评价失败')
    } finally {
      setLoading(false)
    }
  }

  // 修改 useEffect 使用 fetchReviews
  useEffect(() => {
    let isSubscribed = true

    const loadInitialReviews = async () => {
      try {
        setLoading(true)
        const response = await fetch(
          `/api/models/${modelId}/reviews?page=${page}&sort=${sortBy}`
        )
        if (!response.ok) throw new Error('获取评价失败')
        const data = await response.json()
        
        if (isSubscribed) {
          setReviews(data.reviews)
          setTotalPages(data.pages)
        }
      } catch (error) {
        console.error('获取评价失败:', error)
        if (isSubscribed) {
          toast.error('获取评价失败')
        }
      } finally {
        if (isSubscribed) {
          setLoading(false)
        }
      }
    }

    loadInitialReviews()

    return () => {
      isSubscribed = false
    }
  }, [modelId, page, sortBy])

  // 修改点赞处理函数
  const handleLike = async (reviewId: string) => {
    if (!session) {
      toast.error('请先登录')
      return
    }

    setIsLiking(reviewId)
    try {
      const response = await fetch(`/api/models/${modelId}/reviews/${reviewId}/like`, {
        method: 'POST'
      })
      if (!response.ok) throw new Error('操作失败')
      
      // 更新本地状态
      setReviews(prev => prev.map(review => {
        if (review.id === reviewId) {
          const newIsLiked = !review.isLiked
          return {
            ...review,
            isLiked: newIsLiked,
            _count: {
              ...review._count,
              likedBy: review.isLiked 
                ? review._count.likedBy - 1 
                : review._count.likedBy + 1
            }
          }
        }
        return review
      }))

      // 根据操作结果显示不同的提示
      const data = await response.json()
      toast.success(data.isLiked ? '点赞成功' : '已取消点赞')
    } catch (error) {
      toast.error('操作失败，请稍后重试')
    } finally {
      setIsLiking(null)
    }
  }

  // 修改回复按钮点击处理
  const handleReplyClick = (reviewId: string) => {
    if (!session) {
      toast.error('请先登录')
      router.push('/login')
      return
    }
    setActiveReplyId(activeReplyId === reviewId ? null : reviewId)
  }

  // 处理回复提交
  const handleReplySubmit = async (reviewId: string, content: string) => {
    if (!session) {
      toast.error('请先登录')
      return
    }

    try {
      const response = await fetch(`/api/models/${modelId}/reviews/${reviewId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      })

      if (!response.ok) throw new Error('回复失败')
      
      const newReply = await response.json()
      
      // 更新本地状态
      setReviews(prev => prev.map(review => {
        if (review.id === reviewId) {
          return {
            ...review,
            replies: [...review.replies, newReply]
          }
        }
        return review
      }))

      // 关闭回复框
      setActiveReplyId(null)
      toast.success('回复成功')
    } catch (error) {
      toast.error('回复失败')
    }
  }

  // 修改评价提交处理函数
  const handleReviewSubmit = async (content: string, rating: number) => {
    if (!session) {
      toast.error('请先登录')
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/models/${modelId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, rating })
      })

      if (!response.ok) throw new Error('发表评价失败')
      
      const newReview = await response.json()
      setReviews(prev => [newReview, ...prev])
      toast.success('评价发表成功')
      
      // 调用回调通知评论数增加
      onReviewChange?.(1)
      
      // 刷新评价列表以获取最新数据
      fetchReviews()
      setShowReviewForm(false)  // 提交成功后关闭表单
    } catch (error) {
      toast.error('发表评价失败')
    } finally {
      setLoading(false)
    }
  }

  // 修改删除评论的处理函数
  const handleDeleteReview = async (reviewId: string) => {
    setDeleteTarget({ type: 'review', reviewId })
    setShowDeleteConfirm(true)
  }

  // 修改删除回复的处理函数
  const handleDeleteReply = async (reviewId: string, replyId: string) => {
    setDeleteTarget({ type: 'reply', reviewId, replyId })
    setShowDeleteConfirm(true)
  }

  // 添加确认删除的处理函数
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return

    const deletingId = deleteTarget.type === 'review' 
      ? deleteTarget.reviewId 
      : deleteTarget.replyId ?? null

    setIsDeleting(deletingId)
    try {
      if (deleteTarget.type === 'review') {
        const response = await fetch(
          `/api/models/${modelId}/reviews/${deleteTarget.reviewId}`,
          { method: 'DELETE' }
        )

        if (!response.ok) throw new Error('删除失败')
        
        // 更新本地状态
        setReviews(prev => prev.filter(review => review.id !== deleteTarget.reviewId))
        
        // 调用回调通知评论数减少
        onReviewChange?.(-1)
        
        toast.success('评价删除成功')
      } else if (deleteTarget.replyId) {
        const response = await fetch(
          `/api/models/${modelId}/reviews/${deleteTarget.reviewId}/replies/${deleteTarget.replyId}`,
          { method: 'DELETE' }
        )

        if (!response.ok) throw new Error('删除失败')
        
        // 更新本地状态
        setReviews(prev => prev.map(review => {
          if (review.id === deleteTarget.reviewId) {
            return {
              ...review,
              replies: review.replies.filter(reply => reply.id !== deleteTarget.replyId)
            }
          }
          return review
        }))
        
        toast.success('回复删除成功')
      }
    } catch (error) {
      toast.error('删除失败')
    } finally {
      setIsDeleting(null)
      setShowDeleteConfirm(false)
      setDeleteTarget(null)
    }
  }

  // 渲染评价卡片
  const ReviewCard = ({ review }: { review: Review }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="group bg-white rounded-xl p-6 shadow-sm space-y-4"
    >
      {/* 评价头部 */}
      <div className="flex justify-between items-start">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium">
            {review.user.name?.[0] || review.user.email[0]}
          </div>
          <div>
            <p className="font-medium text-gray-900">{review.user.name || '用户'}</p>
            <p className="text-sm text-gray-500">
              {format(new Date(review.createdAt), 'yyyy年MM月dd日 HH:mm')}
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
              title="删除评论"
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
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
          <span>回复</span>
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
                    {reply.user.name || '用户'}
                  </span>
                  <span className="text-sm text-gray-500">
                    {format(new Date(reply.createdAt), 'MM月dd日 HH:mm')}
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
                    title="删除回复"
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
                title="关闭"
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
                  toast.error('请先登录')
                  router.push('/login')
                  return
                }
                setShowReviewForm(true)
              }}
              className="w-full px-6 py-3 text-center rounded-lg border-2 border-dashed border-gray-300 text-gray-600 hover:border-blue-500 hover:text-blue-500 transition-colors"
            >
              发表评论
            </button>
          )}
        </div>
      )}

      {/* 筛选和排序 */}
      <div className="flex justify-between items-center px-4 py-3 flex-shrink-0 border-t border-b bg-gray-50/80">
        <div className="flex items-center gap-4">
          <h3 className="font-medium text-gray-900">评论区</h3>
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as typeof sortBy)
              fetchReviews(1, e.target.value as typeof sortBy)
            }}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white"
          >
            <option value="latest">最新</option>
            <option value="rating">评分</option>
            <option value="likes">点赞</option>
          </select>
        </div>
        <div className="text-sm text-gray-500">
          {reviews.length > 0 && `共 ${reviews.length} 条评论`}
        </div>
      </div>

      {/* 加载状态 */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
        </div>
      )}

      {/* 评价列表 */}
      {!loading && (
        <div className="flex-1 overflow-y-auto px-4">
          <div className="py-4 space-y-4">
            <AnimatePresence>
              {reviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </AnimatePresence>

            {/* 空状态提示 */}
            {reviews.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                <p>来发表第一条评论吧</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex justify-center space-x-2 p-4 border-t flex-shrink-0 bg-white">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setPage(i + 1)
                fetchReviews(i + 1)
              }}
              className={`w-8 h-8 rounded-lg ${
                page === i + 1
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } transition-colors`}
            >
              {i + 1}
            </button>
          ))}
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
        title={deleteTarget?.type === 'review' ? '删除评价' : '删除回复'}
        message={deleteTarget?.type === 'review' 
          ? '确定要删除这条评价吗？此操作无法撤销。'
          : '确定要删除这条回复吗？此操作无法撤销。'
        }
        confirmText="确认删除"
        type="danger"
      />
    </div>
  )
} 
