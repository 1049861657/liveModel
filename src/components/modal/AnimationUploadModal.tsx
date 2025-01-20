'use client'

import { useState, useEffect } from 'react'
import { Dialog } from '@headlessui/react'
import { toast } from 'react-hot-toast'
import { formatTimeDistance } from '@/utils/format'

interface Model {
  id: string
  name: string
  format: string
  createdAt: Date
}

interface AnimationFile {
  file: File;
  name: string;
}

interface AnimationUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onUploadSuccess?: () => void
}

export default function AnimationUploadModal({
  isOpen,
  onClose,
  onUploadSuccess
}: AnimationUploadModalProps) {
  const [daeModels, setDaeModels] = useState<Model[]>([])
  const [selectedModel, setSelectedModel] = useState<Model | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<AnimationFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchDaeModels()
    } else {
      setSelectedModel(null)
      setSelectedFiles([])
    }
  }, [isOpen])

  const fetchDaeModels = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/models?format=dae&own=true')
      if (!response.ok) throw new Error('获取 DAE 模型失败')
      const data = await response.json()
      setDaeModels(data)
      
      if (data.length === 0) {
        toast.error('请先上传 DAE 模型')
        onClose()
      } else {
        setSelectedModel(data[0])
      }
    } catch (error) {
      console.error('获取 DAE 模型失败:', error)
      toast.error('获取 DAE 模型失败')
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      const validFiles = files.filter(file => {
        if (file.name.toLowerCase().endsWith('.smd')) {
          return true
        }
        toast.error(`文件 ${file.name} 不是SMD格式`)
        return false
      })
      
      const newAnimationFiles = validFiles.map(file => ({
        file,
        name: file.name.replace('.smd', '')
      }))
      
      setSelectedFiles(prev => [...prev, ...newAnimationFiles])
    }
  }

  const handleRemoveFile = (fileToRemove: AnimationFile) => {
    setSelectedFiles(prev => prev.filter(file => file !== fileToRemove))
  }

  const handleNameChange = (index: number, newName: string) => {
    setSelectedFiles(prev => prev.map((file, i) => 
      i === index ? { ...file, name: newName } : file
    ))
  }

  const handleUpload = async () => {
    if (!selectedModel) {
      toast.error('请选择模型')
      return
    }

    if (selectedFiles.length === 0) {
      toast.error('请选择动画文件')
      return
    }

    setIsUploading(true)
    try {
      for (const { file, name } of selectedFiles) {
        const formData = new FormData()
        formData.append('animation', file)
        formData.append('modelId', selectedModel.id)
        formData.append('name', name)

        const response = await fetch('/api/upload/animation', {
          method: 'POST',
          body: formData
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || `上传 ${name} 失败`)
        }
      }

      toast.success('所有动画上传成功')
      onUploadSuccess?.()
      onClose()
    } catch (error) {
      console.error('上传错误:', error)
      toast.error(error instanceof Error ? error.message : '上传失败')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog
      open={isOpen}
      onClose={() => {
        if (!isUploading) onClose()
      }}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-xl w-full bg-white rounded-xl shadow-lg">
          <div className="p-6">
            <Dialog.Title className="text-lg font-semibold mb-4">
              上传动画
            </Dialog.Title>

            {loading ? (
              <div className="py-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-500" />
                <div className="mt-2 text-gray-500">加载中...</div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 模型选择下拉框 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    选择关联模型
                  </label>
                  <select
                    value={selectedModel?.id || ''}
                    onChange={(e) => {
                      const model = daeModels.find(m => m.id === e.target.value)
                      setSelectedModel(model || null)
                    }}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {daeModels.map(model => (
                      <option key={model.id} value={model.id}>
                        {model.name} ({formatTimeDistance(model.createdAt)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 文件上传区域 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    选择动画
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      onChange={handleFileChange}
                      accept=".smd"
                      multiple
                      className="hidden"
                      id="animation-file-input"
                    />
                    <label
                      htmlFor="animation-file-input"
                      className="block w-full border-2 border-dashed rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer"
                    >
                      <div className="space-y-2">
                        <svg className="mx-auto h-12 w-12 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="text-gray-600">
                          点击上传
                        </div>
                        <p className="text-sm text-gray-500">
                          支持 SMD 格式
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* 已选文件列表 */}
                  {selectedFiles.length > 0 && (
                    <div className="mt-4">
                      <div className="text-sm font-medium text-gray-700 mb-2">
                        已选择 {selectedFiles.length} 个文件
                      </div>
                      <div className="space-y-2">
                        {selectedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg">
                            <div className="flex-1 flex items-center gap-2">
                              <input
                                type="text"
                                value={file.name}
                                onChange={(e) => handleNameChange(index, e.target.value)}
                                className="flex-1 text-sm text-gray-600 bg-transparent border border-transparent px-2 py-1 rounded focus:border-blue-500 focus:outline-none"
                                placeholder="输入动画名称"
                              />
                              <span className="text-sm text-gray-400">.smd</span>
                            </div>
                            <button
                              onClick={() => handleRemoveFile(file)}
                              className="ml-2 text-gray-400 hover:text-red-500"
                            >
                              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 按钮区域 */}
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={onClose}
                    disabled={isUploading}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={isUploading || selectedFiles.length === 0}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center"
                  >
                    {isUploading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        上传中...
                      </>
                    ) : (
                      '上传'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}
  