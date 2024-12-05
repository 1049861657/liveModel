'use client'

import React, { useCallback, useState, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'

interface FileInfo {
  file: File
  name: string
  description: string
  isPublic: boolean
  textures: File[]
}

interface ModelUploaderProps {
  onUploadSuccess?: () => void;
}

export default function ModelUploader({ onUploadSuccess }: ModelUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null)
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return
    const file = acceptedFiles[0]
    setSelectedFile({
      file,
      name: file.name.replace(/\.[^/.]+$/, ''),
      description: '',
      isPublic: true,
      textures: []
    })
  }, [])

  const handleTextureUpload = (files: FileList | null) => {
    if (!files || !selectedFile) return
    
    const newTextures = Array.from(files)
    setSelectedFile({
      ...selectedFile,
      textures: [...selectedFile.textures, ...newTextures]
    })
  }

  const removeTexture = (index: number) => {
    if (!selectedFile) return
    setSelectedFile({
      ...selectedFile,
      textures: selectedFile.textures.filter((_, i) => i !== index)
    })
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedFile) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('model', selectedFile.file)
      formData.append('name', selectedFile.name)
      formData.append('description', selectedFile.description)
      formData.append('isPublic', selectedFile.isPublic.toString())
      
      selectedFile.textures.forEach((texture, index) => {
        formData.append(`texture_${index}`, texture)
      })

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json()
        throw new Error(errorData.error || '文件上传失败')
      }

      toast.success('模型上传成功')
      onUploadSuccess?.()
      formRef.current?.reset()
      setSelectedFile(null)
      router.refresh()

    } catch (error) {
      console.error('上传错误:', error)
      toast.error(error instanceof Error ? error.message : '上传失败')
    } finally {
      setUploading(false)
    }
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

  if (selectedFile) {
    const isDaeFile = selectedFile.file.name.toLowerCase().endsWith('.dae')

    return (
      <form onSubmit={handleSubmit} className="space-y-6" ref={formRef}>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            文件名
          </label>
          <input
            type="text"
            value={selectedFile.name}
            onChange={(e) => setSelectedFile({
              ...selectedFile,
              name: e.target.value
            })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            描述
          </label>
          <textarea
            value={selectedFile.description}
            onChange={(e) => setSelectedFile({
              ...selectedFile,
              description: e.target.value
            })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-24 resize-none"
            placeholder="添加模型描述（可选）"
          />
        </div>

        {isDaeFile && (
          <div>
            <div className="flex items-center gap-2">
              <label className="block text-sm font-medium text-gray-700">
                贴图文件（可选）
              </label>
              <div className="group relative inline-block">
                <svg className="w-4 h-4 text-gray-400 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="invisible group-hover:visible absolute left-0 top-6 w-48 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
                  仅部分DAE格式模型需要上传贴图文件
                </div>
              </div>
            </div>
            <div className="space-y-4">
              {selectedFile.textures.length > 0 && (
                <div className="space-y-2">
                  {selectedFile.textures.map((texture, index) => (
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
                            {(texture.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeTexture(index)}
                        className="p-1 text-gray-400 hover:text-red-500"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-center w-full">
                <label className="w-full flex flex-col items-center px-4 py-6 bg-white rounded-lg border-2 border-dashed border-gray-300 cursor-pointer hover:border-blue-500 hover:bg-gray-50">
                  <div className="flex flex-col items-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="mt-2 text-sm text-gray-500">点击添加贴图</p>
                    <p className="text-xs text-gray-500 mt-1">支持 PNG、JPG 格式</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept=".png,.jpg,.jpeg"
                    multiple
                    onChange={(e) => handleTextureUpload(e.target.files)}
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center">
          <input
            type="checkbox"
            id="isPublic"
            checked={selectedFile.isPublic}
            onChange={(e) => setSelectedFile({
              ...selectedFile,
              isPublic: e.target.checked
            })}
            className="h-4 w-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="isPublic" className="ml-2 text-sm text-gray-700">
            公开模型（其他用户可以查看）
          </label>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={uploading}
            className={`flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors
              ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {uploading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                上传中...
              </div>
            ) : '上传模型'}
          </button>
          <button
            type="button"
            onClick={() => setSelectedFile(null)}
            disabled={uploading}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
        </div>
      </form>
    )
  }

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
        ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-500'}`}
    >
      <input {...getInputProps()} />
      {isDragActive ? (
        <p className="text-blue-500">将文件拖放到此处</p>
      ) : (
        <div>
          <p className="text-gray-600">
            拖放3D模型文件到此处，或点击选择文件
          </p>
          <p className="text-sm text-gray-500 mt-2">
            支持 .glb 和 .dae 格式，最大100MB
          </p>
        </div>
      )}
    </div>
  )
} 