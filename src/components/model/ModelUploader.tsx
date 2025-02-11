'use client'

import React, { useCallback, useState, useRef, useReducer, useMemo } from 'react'
import { useDropzone } from 'react-dropzone'
import { toast } from 'react-hot-toast'
import { useRouter } from '@/i18n/routing'
import { formatFileSize } from '@/lib/format'
import { useTranslations } from 'next-intl'
import { useMutation } from '@tanstack/react-query'

interface FileInfo {
  file: File
  name: string
  description: string
  isPublic: boolean
  textures: File[]
  gltfFiles?: File[]
  fileTree?: FileTreeNode
}

interface FileTreeNode {
  name: string
  type: 'file' | 'directory'
  size?: number
  children?: FileTreeNode[]
  file?: File
  path: string
}

interface ModelUploaderProps {
  onUploadSuccess?: () => void;
}

// 状态类型定义
interface UploadState {
  uploading: boolean
  selectedFile: FileInfo | null
}

// Action 类型定义
type UploadAction =
  | { type: 'SET_UPLOADING'; payload: boolean }
  | { type: 'SET_SELECTED_FILE'; payload: FileInfo | null }
  | { type: 'UPDATE_SELECTED_FILE'; payload: Partial<FileInfo> }
  | { type: 'ADD_TEXTURES'; payload: File[] }
  | { type: 'REMOVE_TEXTURE'; payload: number }
  | { type: 'RESET' }

// 初始状态
const initialState: UploadState = {
  uploading: false,
  selectedFile: null
}

// Reducer 函数
function uploadReducer(state: UploadState, action: UploadAction): UploadState {
  switch (action.type) {
    case 'SET_UPLOADING':
      return { ...state, uploading: action.payload }
    case 'SET_SELECTED_FILE':
      return { ...state, selectedFile: action.payload }
    case 'UPDATE_SELECTED_FILE':
      return state.selectedFile
        ? { ...state, selectedFile: { ...state.selectedFile, ...action.payload } }
        : state
    case 'ADD_TEXTURES':
      return state.selectedFile
        ? {
            ...state,
            selectedFile: {
              ...state.selectedFile,
              textures: [...state.selectedFile.textures, ...action.payload]
            }
          }
        : state
    case 'REMOVE_TEXTURE':
      return state.selectedFile
        ? {
            ...state,
            selectedFile: {
              ...state.selectedFile,
              textures: state.selectedFile.textures.filter((_, i) => i !== action.payload)
            }
          }
        : state
    case 'RESET':
      return initialState
    default:
      return state
  }
}

export default function ModelUploader({ onUploadSuccess }: ModelUploaderProps) {
  const [state, dispatch] = useReducer(uploadReducer, initialState)
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const directoryInputRef = useRef<HTMLInputElement>(null)
  const t = useTranslations('ModelUploader')

  // 使用 react-query 管理上传操作
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/upload/model', {
        method: 'POST',
        body: formData,
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || t('uploadFailed'))
      }
      return response.json()
    },
    onMutate: () => {
      dispatch({ type: 'SET_UPLOADING', payload: true })
    },
    onSuccess: () => {
      toast.success(t('uploadSuccess'))
      onUploadSuccess?.()
      formRef.current?.reset()
      dispatch({ type: 'RESET' })
      router.refresh()
    },
    onError: (error) => {
      console.error('上传错误:', error)
      toast.error(error instanceof Error ? error.message : t('uploadFailed'))
    },
    onSettled: () => {
      dispatch({ type: 'SET_UPLOADING', payload: false })
    }
  })

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return
    const file = acceptedFiles[0]
    
    if (file.name.toLowerCase().endsWith('.gltf')) {
      toast.error(t('gltfUploadError'))
      return
    }

    dispatch({
      type: 'SET_SELECTED_FILE',
      payload: {
        file,
        name: file.name.replace(/\.[^/.]+$/, ''),
        description: '',
        isPublic: true,
        textures: []
      }
    })
  }, [t])

  const buildFileTree = (files: File[]): FileTreeNode => {
    const root: FileTreeNode = {
      name: '/',
      type: 'directory',
      children: [],
      path: '/'
    }

    files.forEach(file => {
      const pathParts = file.webkitRelativePath.split('/')
      let currentNode = root
      let currentPath = '/'

      for (let i = 1; i < pathParts.length; i++) {
        const part = pathParts[i]
        currentPath = `${currentPath}${part}/`
        const isFile = i === pathParts.length - 1

        if (isFile) {
          currentNode.children = currentNode.children || []
          currentNode.children.push({
            name: part,
            type: 'file',
            size: file.size,
            file: file,
            path: currentPath.slice(0, -1)
          })
        } else {
          let childNode = currentNode.children?.find(
            child => child.name === part && child.type === 'directory'
          )

          if (!childNode) {
            childNode = {
              name: part,
              type: 'directory',
              children: [],
              path: currentPath.slice(0, -1)
            }
            currentNode.children = currentNode.children || []
            currentNode.children.push(childNode)
          }

          currentNode = childNode
        }
      }
    })

    return root
  }

  const FileTreeView = ({ 
    node, 
    depth = 0,
  }: { 
    node: FileTreeNode, 
    depth?: number,
  }) => {
    const indent = depth * 16
    const [isExpanded, setIsExpanded] = useState(true)

    const getFileIcon = () => {
      const ext = node.name.split('.').pop()?.toLowerCase()
      
      if (node.type === 'directory') {
        return (
          <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
          </svg>
        )
      }

      switch (ext) {
        case 'gltf':
          return (
            <svg className="w-5 h-5 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z"/>
            </svg>
          )
        case 'bin':
          return (
            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd"/>
            </svg>
          )
        case 'jpg':
        case 'png':
        case 'jpeg':
          return (
            <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"/>
            </svg>
          )
        default:
          return (
            <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd"/>
            </svg>
          )
      }
    }

    const toggleExpand = (e: React.MouseEvent) => {
      e.stopPropagation()
      setIsExpanded(!isExpanded)
    }

    return (
      <div>
        <div 
          className="flex items-center gap-2 py-1.5 hover:bg-gray-50 rounded-md relative group"
          style={{ paddingLeft: `${indent}px` }}
        >
          {node.type === 'directory' && node.children?.length ? (
            <button
              onClick={toggleExpand}
              className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-blue-50 transition-all duration-200 group"
            >
              <svg
                className={`w-4 h-4 text-blue-500 transform transition-transform duration-300 ease-out ${isExpanded ? 'rotate-90' : ''} group-hover:scale-110`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          ) : (
            <span className="inline-block w-5"></span>
          )}
          <div className={`flex items-center gap-2 transition-all duration-200 ${node.type === 'directory' ? 'hover:text-blue-500' : ''}`}>
            {getFileIcon()}
            <span className="text-sm">{node.name}</span>
            {node.type === 'file' && node.size && (
              <span className="text-xs text-gray-400 transition-colors group-hover:text-blue-400">
                ({formatFileSize(node.size)})
              </span>
            )}
          </div>
        </div>
        {node.children?.length && isExpanded && (
          <div>
            {node.children.map((child, index) => (
              <FileTreeView 
                key={index} 
                node={child} 
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  const handleDirectorySelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const gltfFiles = Array.from(files).filter(file => file.name.toLowerCase().endsWith('.gltf'))
    
    if (gltfFiles.length === 0) {
      toast.error(t('fileNotFound'))
      return
    }

    if (gltfFiles.length > 1) {
      toast.error(t('multipleFiles'))
      return
    }

    const gltfFile = gltfFiles[0]
    const mainFileName = gltfFile.name.replace(/\.gltf$/i, '')

    const allFiles = Array.from(files)
    const fileTree = buildFileTree(allFiles)

    dispatch({
      type: 'SET_SELECTED_FILE',
      payload: {
        file: gltfFile,
        name: mainFileName,
        description: '',
        isPublic: true,
        textures: [],
        gltfFiles: allFiles,
        fileTree: fileTree
      }
    })
  }

  const handleTextureUpload = useCallback((files: FileList | null) => {
    if (!files || !state.selectedFile) return
    dispatch({ type: 'ADD_TEXTURES', payload: Array.from(files) })
  }, [state.selectedFile])

  const removeTexture = useCallback((index: number) => {
    dispatch({ type: 'REMOVE_TEXTURE', payload: index })
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!state.selectedFile) return

    const formData = new FormData()
    formData.append('model', state.selectedFile.file)
    formData.append('name', state.selectedFile.name)
    formData.append('description', state.selectedFile.description)
    formData.append('isPublic', String(state.selectedFile.isPublic))

    const texturesSize = state.selectedFile.textures.reduce((sum, texture) => sum + texture.size, 0) + 
      (state.selectedFile.gltfFiles?.reduce((sum, file) => {
        if (file.name.toLowerCase().endsWith('.gltf')) return sum
        return sum + file.size
      }, 0) || 0)
    
    formData.append('texturesSize', String(texturesSize))
    
    state.selectedFile.textures.forEach((texture, index) => {
      formData.append(`texture_${index}`, texture)
    })
    
    if (state.selectedFile.gltfFiles) {
      state.selectedFile.gltfFiles.forEach((file, index) => {
        formData.append(`gltf_${index}`, file)
      })
    }

    uploadMutation.mutate(formData)
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'model/gltf-binary': ['.glb'],
      'model/collada+xml': ['.dae'],
    },
    maxFiles: 1,
    multiple: false,
  })

  // 使用 useMemo 缓存文件类型检查
  const isValidFileType = useMemo(() => {
    const validTypes = new Set(['.glb', '.dae', '.gltf', '.fbx', '.obj'])
    return (fileName: string) => {
      const ext = fileName.toLowerCase().slice(fileName.lastIndexOf('.'))
      return validTypes.has(ext)
    }
  }, [])

  // 使用 useMemo 缓存文件大小限制
  const FILE_SIZE_LIMIT = useMemo(() => 1024 * 1024 * 100, []) // 100MB

  // 使用 useMemo 缓存拖放配置
  const dropzoneConfig = useMemo(() => ({
    onDrop,
    accept: {
      'model/gltf-binary': ['.glb'],
      'model/collada+xml': ['.dae'],
    },
    maxFiles: 1,
    multiple: false,
  }), [onDrop])

  // 使用 useMemo 缓存文件扩展名检查
  const { isDaeFile, isGltfFile } = useMemo(() => ({
    isDaeFile: state.selectedFile?.file.name.toLowerCase().endsWith('.dae') ?? false,
    isGltfFile: state.selectedFile?.file.name.toLowerCase().endsWith('.gltf') ?? false
  }), [state.selectedFile?.file.name])

  // 使用 useCallback 优化事件处理函数
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({
      type: 'UPDATE_SELECTED_FILE',
      payload: { name: e.target.value }
    })
  }, [])

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    dispatch({
      type: 'UPDATE_SELECTED_FILE',
      payload: { description: e.target.value }
    })
  }, [])

  const handleIsPublicChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({
      type: 'UPDATE_SELECTED_FILE',
      payload: { isPublic: e.target.checked }
    })
  }, [])

  const handleCancel = useCallback(() => {
    formRef.current?.reset()
    dispatch({ type: 'RESET' })
  }, [])

  if (state.selectedFile) {
    return (
      <>
        {/* 相关文件区域 - 只在GLTF文件时显示 */}
        {isGltfFile && (
          <div className="fixed left-8 top-24 w-[420px] z-10">
            <div className="bg-white rounded-lg border shadow-sm">
              <div className="p-3 border-b bg-gray-50">
                <h3 className="text-sm font-medium text-gray-700">{t('relatedFiles')}</h3>
              </div>
              <div className="max-h-[calc(100vh-200px)] overflow-y-auto p-2">
                {state.selectedFile?.fileTree ? (
                  <FileTreeView 
                    node={state.selectedFile.fileTree}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                    <svg className="w-12 h-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    <p className="text-sm">{t('selectFileToView')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 主要内容区域 - 独立布局 */}
        <div className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6" ref={formRef}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('fileName')}
              </label>
              <input
                type="text"
                value={state.selectedFile.name}
                onChange={handleNameChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('description')}
              </label>
              <textarea
                value={state.selectedFile.description}
                onChange={handleDescriptionChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
              />
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">{state.selectedFile.file.name}</p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(state.selectedFile.file.size)}
                  </p>
                </div>
              </div>
            </div>

            {isDaeFile && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('textures')}
                </label>
                <div className="mt-2">
                  <input
                    type="file"
                    onChange={(e) => handleTextureUpload(e.target.files)}
                    multiple
                    accept="image/*"
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100"
                  />
                </div>
                {state.selectedFile.textures.length > 0 && (
                  <div className="space-y-2">
                    {state.selectedFile.textures.map((texture: File, index: number) => (
                      <div 
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700">{texture.name}</p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(texture.size)}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeTexture(index)}
                          className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                        >
                          <svg className="w-5 h-5 text-gray-400 hover:text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isPublic"
                checked={state.selectedFile.isPublic}
                onChange={handleIsPublicChange}
                className="h-4 w-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="isPublic" className="ml-2 text-sm text-gray-700">
                {t('publicShare')}
              </label>
            </div>

            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={state.uploading}
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                disabled={state.uploading}
              >
                {state.uploading ? t('uploading') : t('upload')}
              </button>
            </div>
          </form>
        </div>
      </>
    )
  }

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-500'
        }`}
      >
        <input {...getInputProps()} />
        <div className="space-y-2">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <div className="text-gray-600">
            {t('dragDropText')}
          </div>
          <p className="text-sm text-gray-500">
            {t('supportedFormats')}
          </p>
        </div>
      </div>

      <div className="text-center">
        <input
          type="file"
          ref={directoryInputRef}
          onChange={handleDirectorySelect}
          {...{ webkitdirectory: '', directory: '' } as any}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => directoryInputRef.current?.click()}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          {t('selectGltfFolder')}
        </button>
      </div>
    </div>
  )
} 