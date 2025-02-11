'use client'

import { useCallback, useReducer, useMemo, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Select from '@radix-ui/react-select'
import { toast } from 'react-hot-toast'
import { formatTimeDistance } from '@/utils/format'
import { useTranslations } from 'next-intl'
import { useLocale } from 'next-intl'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'motion/react'
import { Cross2Icon, ChevronDownIcon, ChevronUpIcon } from '@radix-ui/react-icons'

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

// 状态类型定义
interface UploadState {
  daeModels: Model[]
  selectedModel: Model | null
  selectedFiles: AnimationFile[]
  isUploading: boolean
  loading: boolean
}

// Action 类型定义
type UploadAction =
  | { type: 'SET_MODELS'; payload: Model[] }
  | { type: 'SET_SELECTED_MODEL'; payload: Model | null }
  | { type: 'SET_SELECTED_FILES'; payload: AnimationFile[] }
  | { type: 'ADD_SELECTED_FILES'; payload: AnimationFile[] }
  | { type: 'REMOVE_FILE'; payload: AnimationFile }
  | { type: 'UPDATE_FILE_NAME'; payload: { index: number; name: string } }
  | { type: 'SET_UPLOADING'; payload: boolean }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'RESET' }

// 初始状态
const initialState: UploadState = {
  daeModels: [],
  selectedModel: null,
  selectedFiles: [],
  isUploading: false,
  loading: false
}

// Reducer 函数
function uploadReducer(state: UploadState, action: UploadAction): UploadState {
  switch (action.type) {
    case 'SET_MODELS':
      return { ...state, daeModels: action.payload }
    case 'SET_SELECTED_MODEL':
      return { ...state, selectedModel: action.payload }
    case 'SET_SELECTED_FILES':
      return { ...state, selectedFiles: action.payload }
    case 'ADD_SELECTED_FILES':
      return { ...state, selectedFiles: [...state.selectedFiles, ...action.payload] }
    case 'REMOVE_FILE':
      return { 
        ...state, 
        selectedFiles: state.selectedFiles.filter(file => file !== action.payload)
      }
    case 'UPDATE_FILE_NAME':
      return {
        ...state,
        selectedFiles: state.selectedFiles.map((file, i) =>
          i === action.payload.index ? { ...file, name: action.payload.name } : file
        )
      }
    case 'SET_UPLOADING':
      return { ...state, isUploading: action.payload }
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'RESET':
      return { ...initialState }
    default:
      return state
  }
}

// 添加查询结果类型
type DaeModelsQueryResult = {
  models: Model[]
  total: number
  pages: number
}

export default function AnimationUploadModal({
  isOpen,
  onClose,
  onUploadSuccess
}: AnimationUploadModalProps) {
  const t = useTranslations('AnimationUploadModal')
  const locale = useLocale()
  const [state, dispatch] = useReducer(uploadReducer, initialState)

  // 使用 react-query 获取模型列表
  const { refetch: refetchModels } = useQuery<DaeModelsQueryResult>({
    queryKey: ['daeModels'],
    queryFn: async () => {
      const response = await fetch('/api/models?format=dae&own=true')
      if (!response.ok) throw new Error(t('fetchError'))
      return response.json()
    },
    enabled: isOpen,
    retry: false
  })

  // 使用 useEffect 处理数据和错误
  useEffect(() => {
    if (isOpen) {
      dispatch({ type: 'SET_LOADING', payload: true })
      refetchModels()
        .then(({ data }) => {
          const models = Array.isArray(data?.models) ? data.models : []
          if (models.length === 0) {
            toast.error(t('noDaeModels'))
            onClose()
          } else {
            dispatch({ type: 'SET_MODELS', payload: models })
            dispatch({ type: 'SET_SELECTED_MODEL', payload: models[0] })
          }
        })
        .catch((error: Error) => {
          console.error(t('fetchError'), error)
          toast.error(t('fetchError'))
          onClose()
        })
        .finally(() => {
          dispatch({ type: 'SET_LOADING', payload: false })
        })
    } else {
      dispatch({ type: 'RESET' })
    }
  }, [isOpen, refetchModels, t, onClose])

  // 使用 react-query 管理上传操作
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/upload/animation', {
        method: 'POST',
        body: formData
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || t('uploadFailed'))
      }
      return data
    }
  })

  // 使用 useMemo 缓存文件验证函数
  const validateFile = useMemo(() => (file: File) => {
    if (file.name.toLowerCase().endsWith('.smd')) {
      return true
    }
    toast.error(t('invalidFormat', { name: file.name }))
    return false
  }, [t])

  // 使用 useCallback 优化事件处理函数
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      const validFiles = files.filter(validateFile)
      
      const newAnimationFiles = validFiles.map(file => ({
        file,
        name: file.name.replace('.smd', '')
      }))
      
      dispatch({ type: 'ADD_SELECTED_FILES', payload: newAnimationFiles })
    }
  }, [validateFile])

  const handleRemoveFile = useCallback((fileToRemove: AnimationFile) => {
    dispatch({ type: 'REMOVE_FILE', payload: fileToRemove })
  }, [])

  const handleNameChange = useCallback((index: number, newName: string) => {
    dispatch({ type: 'UPDATE_FILE_NAME', payload: { index, name: newName } })
  }, [])

  const handleModelChange = useCallback((modelId: string) => {
    const model = state.daeModels.find(m => m.id === modelId)
    dispatch({ type: 'SET_SELECTED_MODEL', payload: model || null })
  }, [state.daeModels])

  const handleUpload = useCallback(async () => {
    if (!state.selectedModel) {
      toast.error(t('selectModel'))
      return
    }

    if (state.selectedFiles.length === 0) {
      toast.error(t('selectAnimation'))
      return
    }

    dispatch({ type: 'SET_UPLOADING', payload: true })
    try {
      for (const { file, name } of state.selectedFiles) {
        const formData = new FormData()
        formData.append('animation', file)
        formData.append('modelId', state.selectedModel.id)
        formData.append('name', name)

        await uploadMutation.mutateAsync(formData)
      }

      toast.success(t('uploadSuccess'))
      onUploadSuccess?.()
      onClose()
    } catch (error) {
      console.error(t('uploadError'), error)
      toast.error(error instanceof Error ? error.message : t('uploadFailed'))
    } finally {
      dispatch({ type: 'SET_UPLOADING', payload: false })
    }
  }, [state.selectedModel, state.selectedFiles, uploadMutation, t, onUploadSuccess, onClose])

  // 使用 useMemo 缓存模型选项
  const modelOptions = useMemo(() => 
    state.daeModels.map(model => ({
      value: model.id,
      label: `${model.name} (${formatTimeDistance(model.createdAt, locale)})`
    }))
  , [state.daeModels, locale])

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !state.isUploading && !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay asChild>
          <motion.div 
            className="fixed inset-0 bg-black/30 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        </Dialog.Overlay>
        
        <Dialog.Content asChild>
          <motion.div 
            className="fixed inset-0 flex items-center justify-center p-4 z-50"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2, type: "spring" }}
          >
            <div className="relative mx-auto max-w-xl w-full bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title className="text-lg font-semibold">
                    {t('title')}
                  </Dialog.Title>
                  <Dialog.Close asChild>
                    <button
                      className="rounded-full p-1.5 hover:bg-gray-100 transition-colors"
                      aria-label={t('close')}
                      disabled={state.isUploading}
                    >
                      <Cross2Icon className="w-4 h-4" />
                    </button>
                  </Dialog.Close>
                </div>

                {state.loading ? (
                  <div className="py-12 text-center">
                    <motion.div 
                      className="inline-block rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-500"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                    <div className="mt-2 text-gray-500">{t('loading')}</div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* 模型选择下拉框 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('selectModel')}
                      </label>
                      <Select.Root
                        value={state.selectedModel?.id}
                        onValueChange={handleModelChange}
                      >
                        <Select.Trigger
                          className="w-full px-3 py-2 flex items-center justify-between bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          aria-label={t('selectModel')}
                        >
                          <Select.Value placeholder={t('selectModelPlaceholder')} />
                          <Select.Icon>
                            <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                          </Select.Icon>
                        </Select.Trigger>

                        <Select.Portal>
                          <Select.Content
                            className="overflow-hidden bg-white rounded-lg shadow-lg border border-gray-200 z-50 w-[var(--radix-select-trigger-width)]"
                            position="popper"
                            sideOffset={5}
                          >
                            <Select.ScrollUpButton className="flex items-center justify-center h-6 bg-white text-gray-500 cursor-default">
                              <ChevronUpIcon />
                            </Select.ScrollUpButton>
                            
                            <Select.Viewport className="p-1">
                              {modelOptions.map(option => (
                                <Select.Item
                                  key={option.value}
                                  value={option.value}
                                  className="relative flex items-center px-6 py-2 rounded-md text-sm text-gray-700 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none cursor-pointer"
                                >
                                  <Select.ItemText>{option.label}</Select.ItemText>
                                </Select.Item>
                              ))}
                            </Select.Viewport>

                            <Select.ScrollDownButton className="flex items-center justify-center h-6 bg-white text-gray-500 cursor-default">
                              <ChevronDownIcon />
                            </Select.ScrollDownButton>
                          </Select.Content>
                        </Select.Portal>
                      </Select.Root>
                    </div>

                    {/* 文件上传区域 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('selectAnimation')}
                      </label>
                      <motion.div 
                        className="relative"
                        whileHover={{ scale: 1.01 }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      >
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
                            <motion.svg 
                              className="mx-auto h-12 w-12 text-gray-400"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1"
                              whileHover={{ scale: 1.1 }}
                              transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </motion.svg>
                            <div className="text-gray-600">
                              {t('clickToUpload')}
                            </div>
                            <p className="text-sm text-gray-500">
                              {t('supportFormat')}
                            </p>
                          </div>
                        </label>
                      </motion.div>

                      {/* 已选文件列表 */}
                      <AnimatePresence>
                        {state.selectedFiles.length > 0 && (
                          <motion.div 
                            className="mt-4"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                          >
                            <div className="text-sm font-medium text-gray-700 mb-2">
                              {t('selectedFiles', { count: state.selectedFiles.length })}
                            </div>
                            <div className="space-y-2">
                              {state.selectedFiles.map((file, index) => (
                                <motion.div
                                  key={index}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: 20 }}
                                  className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg"
                                >
                                  <div className="flex-1 flex items-center gap-2">
                                    <input
                                      type="text"
                                      value={file.name}
                                      onChange={(e) => handleNameChange(index, e.target.value)}
                                      className="flex-1 text-sm text-gray-600 bg-transparent border border-transparent px-2 py-1 rounded focus:border-blue-500 focus:outline-none"
                                      placeholder={t('animationName')}
                                    />
                                    <span className="text-sm text-gray-400">.smd</span>
                                  </div>
                                  <button
                                    onClick={() => handleRemoveFile(file)}
                                    className="ml-2 text-gray-400 hover:text-red-500"
                                    title={t('removeFile')}
                                  >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </motion.div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* 按钮区域 */}
                    <div className="flex justify-end gap-3 pt-4">
                      <Dialog.Close asChild>
                        <button
                          disabled={state.isUploading}
                          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                        >
                          {t('cancel')}
                        </button>
                      </Dialog.Close>
                      <button
                        onClick={handleUpload}
                        disabled={state.isUploading || state.selectedFiles.length === 0}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center transition-colors"
                      >
                        {state.isUploading ? (
                          <>
                            <motion.svg 
                              className="-ml-1 mr-2 h-5 w-5"
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              viewBox="0 0 24 24"
                            >
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </motion.svg>
                            {t('uploading')}
                          </>
                        ) : (
                          t('upload')
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
  