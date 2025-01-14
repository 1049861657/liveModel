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
  gltfFiles?: File[]
}

interface ModelUploaderProps {
  onUploadSuccess?: () => void;
}

export default function ModelUploader({ onUploadSuccess }: ModelUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null)
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const directoryInputRef = useRef<HTMLInputElement>(null)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return
    const file = acceptedFiles[0]
    
    if (file.name.toLowerCase().endsWith('.gltf')) {
      toast.error('GLTF格式请点击"选择文件夹"按钮上传完整文件夹')
      return
    }

    setSelectedFile({
      file,
      name: file.name.replace(/\.[^/.]+$/, ''),
      description: '',
      isPublic: true,
      textures: []
    })
  }, [])

  const handleDirectorySelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const gltfFile = Array.from(files).find(file => file.name.toLowerCase().endsWith('.gltf'))
    if (!gltfFile) {
      toast.error('未找到 GLTF 文件')
      return
    }

    const mainFileName = gltfFile.name.replace(/\.gltf$/i, '')

    const allFiles = Array.from(files).filter(file => {
      const fileName = file.name.replace(/\.gltf$/i, '')
      if (file.name.toLowerCase().endsWith('.gltf')) {
        return file === gltfFile
      }
      return true
    })

    setSelectedFile({
      file: gltfFile,
      name: mainFileName,
      description: '',
      isPublic: true,
      textures: [],
      gltfFiles: allFiles
    })
  }

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
      formData.append('isPublic', String(selectedFile.isPublic))
      
      if (selectedFile.gltfFiles) {
        selectedFile.gltfFiles.forEach((file, index) => {
          formData.append(`gltf_${index}`, file)
        })
      } else {
        selectedFile.textures.forEach((texture, index) => {
          formData.append(`texture_${index}`, texture)
        })
      }

      const uploadResponse = await fetch('/api/upload/model', {
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
    const isGltfFile = selectedFile.file.name.toLowerCase().endsWith('.gltf')

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
              <p className="text-sm font-medium text-gray-700">{selectedFile.file.name}</p>
              <p className="text-xs text-gray-500">
                {(selectedFile.file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
        </div>

        {isGltfFile && selectedFile.gltfFiles && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              相关文件
            </label>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {selectedFile.gltfFiles.map((file, index) => (
                <div key={index} className="text-sm text-gray-600 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  {file.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {isDaeFile && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              贴图（可选）
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
            checked={selectedFile.isPublic}
            onChange={(e) => setSelectedFile({
              ...selectedFile,
              isPublic: e.target.checked
            })}
            className="h-4 w-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="isPublic" className="ml-2 text-sm text-gray-700">
            公开分享
          </label>
        </div>

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => {
              formRef.current?.reset()
              setSelectedFile(null)
            }}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            disabled={uploading}
          >
            取消
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            disabled={uploading}
          >
            {uploading ? '上传中...' : '上传'}
          </button>
        </div>
      </form>
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
            拖放文件到此处，或点击选择文件
          </div>
          <p className="text-sm text-gray-500">
            支持 GLB、DAE 格式
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
          选择 GLTF 文件夹
        </button>
      </div>
    </div>
  )
} 