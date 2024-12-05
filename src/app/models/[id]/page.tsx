'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import ReviewSection from '@/components/reviews/ReviewSection'

interface ModelDetails {
  id: string
  name: string
  description: string
  avgRating: number
  totalReviews: number
  filePath: string
  fileSize: number
  format: string
  user: {
    id: string
    name: string
    email: string
  }
  createdAt: string
}

export default function ModelDetailPage({ params }: { params: { id: string } }) {
  const [model, setModel] = useState<ModelDetails | null>(null)
  const [activeTab, setActiveTab] = useState<'preview' | 'reviews'>('preview')
  const { data: session } = useSession()

  useEffect(() => {
    fetchModelDetails()
  }, [])

  const fetchModelDetails = async () => {
    try {
      const response = await fetch(`/api/models/${params.id}`)
      if (!response.ok) throw new Error('获取模型详情失败')
      const data = await response.json()
      setModel(data)
    } catch (error) {
      console.error('获取模型详情失败:', error)
    }
  }

  if (!model) return <div>加载中...</div>

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 模型基本信息 */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{model.name}</h1>
              <p className="mt-2 text-gray-600">{model.description}</p>
              <div className="mt-4 flex items-center space-x-4 text-sm text-gray-500">
                <div>
                  <span className="font-medium">上传者：</span>
                  <span>{model.user.name || '用户'}</span>
                </div>
                <div>
                  <span className="font-medium">文件大小：</span>
                  <span>{(model.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                </div>
                <div>
                  <span className="font-medium">格式：</span>
                  <span>{model.format.toUpperCase()}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center space-x-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg
                    key={i}
                    className={`w-5 h-5 ${
                      i < Math.round(model.avgRating || 0)
                        ? 'text-yellow-400'
                        : 'text-gray-200'
                    }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
                <button
                  onClick={() => setActiveTab('reviews')}
                  className="ml-2 text-sm text-blue-600 hover:text-blue-700 transition-colors"
                >
                  {model.totalReviews 
                    ? `${model.totalReviews} 条评价` 
                    : "写第一条评价"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 标签页切换 */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'preview'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            预览
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`px-6 py-3 text-sm font-medium flex items-center space-x-2 ${
              activeTab === 'reviews'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>评价</span>
            {model.totalReviews > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === 'reviews'
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {model.totalReviews}
              </span>
            )}
          </button>
        </div>

        {/* 内容区域 */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'preview' ? (
            <div className="bg-white rounded-xl shadow-sm p-6">
              {/* 预览内容 */}
              <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                {/* 这里添加模型预览组件 */}
                <span className="text-gray-500">模型预览区域</span>
              </div>
            </div>
          ) : (
            <ReviewSection modelId={params.id} />
          )}
        </motion.div>
      </div>
    </div>
  )
} 