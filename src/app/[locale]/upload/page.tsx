'use client'

import { Suspense, useEffect, useState, useRef } from 'react'
import ModelUploader from '@/components/model/ModelUploader'
import { formatTimeDistance } from '@/utils/format'
import { toast } from 'react-hot-toast'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { useRouter } from 'next/navigation'
import ModelCard from '@/components/model/ModelCard'
import TextureUploadModal from '@/components/modal/TextureUploadModal'
import AnimationUploadModal from '@/components/modal/AnimationUploadModal'
import { useTranslations } from 'next-intl'

interface Model {
  id: string
  name: string
  description: string | null
  filePath: string
  fileSize: number
  format: string
  componentName: string
  isPublic: boolean
  userId: string
  createdAt: Date
  updatedAt: Date
  user?: {
    id: string
    name: string | null
    email: string
    avatar?: {
      url: string
    } | null
  }
}

function RecentUploads() {
  const t = useTranslations('UploadPage')
  const [recentModels, setRecentModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [modelToDelete, setModelToDelete] = useState<Model | null>(null)
  const [selectedModel, setSelectedModel] = useState<string | null>(null)
  const requestMade = useRef(false)
  const router = useRouter()

  // 将 fetchModels 移到 useEffect 外部
  const fetchModels = async () => {
    try {
      const response = await fetch('/api/models/recent')
      if (!response.ok) throw new Error('获取最近上传失败')
      const data = await response.json()
      setRecentModels(data)
    } catch (error) {
      console.error('获取最近上传失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (requestMade.current) return
    requestMade.current = true
    fetchModels()
  }, [])

  // 修改删除处理流程
  const handleDeleteClick = (model: Model) => {
    setModelToDelete(model)
    setShowConfirmDialog(true)
  }

  const handleConfirmDelete = async () => {
    if (!modelToDelete) return

    setDeletingId(modelToDelete.id)
    setShowConfirmDialog(false)
    
    try {
      const response = await fetch(`/api/models/${modelToDelete.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('删除失败')
      }

      await fetchModels()
      toast.success('删除成功')
    } catch (error) {
      console.error('删除失败:', error)
      toast.error('删除失败，请稍后重试')
    } finally {
      setDeletingId(null)
      setModelToDelete(null)
    }
  }

  // 修改查看按钮的点击处理
  const handleViewClick = (modelId: string) => {
    setSelectedModel(modelId)
  }

  // 添加关闭详情的处理
  const handleCloseDetails = () => {
    setSelectedModel(null)
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        {t('loading')}
      </div>
    )
  }

  if (recentModels.length === 0) {
    return (
      <div className="text-gray-500 text-center py-8">
        {t('noUploads')}
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {recentModels.map((model) => (
          <div 
            key={model.id}
            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <h3 className="font-medium">{model.name}</h3>
              {!model.isPublic && (
                <span className="w-5 h-5 flex items-center justify-center bg-gray-700 bg-opacity-90 rounded-full" title={t('private')}>
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
              )}
              <p className="text-sm text-gray-500">
                {formatTimeDistance(model.createdAt)}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => handleViewClick(model.id)}
                className="text-blue-500 hover:text-blue-600"
              >
                {t('view')}
              </button>
              <button
                onClick={() => handleDeleteClick(model)}
                disabled={deletingId === model.id}
                className={`text-red-500 hover:text-red-600 flex items-center gap-1
                  ${deletingId === model.id ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {deletingId === model.id ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {t('deleting')}
                  </>
                ) : t('delete')}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 添加 ModelCard 组件用于显示详情 */}
      {selectedModel && (
        <ModelCard
          model={recentModels.find(m => m.id === selectedModel)!}
          defaultOpen={true}
          onClose={handleCloseDetails}
          onDelete={fetchModels}
          modalOnly={true}
        />
      )}

      {/* 确认对话框保持不变 */}
      <ConfirmDialog
        isOpen={showConfirmDialog && !!modelToDelete}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={handleConfirmDelete}
        title={t('deleteDialog.title')}
        message={t('deleteDialog.message', { name: modelToDelete?.name })}
        confirmText={t('deleteDialog.confirm')}
        type="danger"
      />
    </>
  )
}

export default function UploadPage() {
  const t = useTranslations('UploadPage')
  const [key, setKey] = useState(0)
  const [showAnimationModal, setShowAnimationModal] = useState(false)
  const [showTextureModal, setShowTextureModal] = useState(false)

  const handleUploadSuccess = () => {
    setKey(prev => prev + 1)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <div className="flex gap-2">
            {/* 上传贴图按钮 */}
            <button
              onClick={() => setShowTextureModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {t('uploadTexture')}
            </button>

            {/* 上传动画按钮 */}
            <button
              onClick={() => setShowAnimationModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t('uploadAnimation')}
            </button>
          </div>
        </div>
        
        {/* 模型上传区域 */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <ModelUploader onUploadSuccess={handleUploadSuccess} />
        </div>

        {/* 上传说明 */}
        <div className="bg-blue-50 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">{t('instructions.title')}</h2>
          <ul className="space-y-2 text-gray-600">
            <li className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {t('instructions.formats')}
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {t('instructions.size')}
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {t('instructions.compression')}
            </li>
          </ul>
        </div>

        {/* 最近上传 */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">{t('recentUploads')}</h2>
          <RecentUploads key={key} />
        </div>

        {/* 动画上传模态框 */}
        <AnimationUploadModal
          isOpen={showAnimationModal}
          onClose={() => setShowAnimationModal(false)}
          onUploadSuccess={handleUploadSuccess}
        />

        {/* 贴图上传模态框 */}
        <TextureUploadModal
          isOpen={showTextureModal}
          onClose={() => setShowTextureModal(false)}
          onUploadSuccess={handleUploadSuccess}
        />
      </div>
    </div>
  )
} 