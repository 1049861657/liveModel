'use client'

import React, { useState, useCallback } from 'react';

interface UploadStats {
  startTime: number;
  endTime: number;
  fileSize: number;
  uploadSpeed: number;
}

const CHUNK_SIZE = 10 * 1024 * 1024; // 增加到10MB per chunk
const MAX_CONCURRENT_UPLOADS = 5; // 减少并发数以避免过多请求
const RETRY_TIMES = 3;

export const UploadComparison: React.FC = () => {
  const [normalStats, setNormalStats] = useState<UploadStats | null>(null);
  const [chunkStats, setChunkStats] = useState<UploadStats | null>(null);
  const [normalProgress, setNormalProgress] = useState(0);
  const [chunkProgress, setChunkProgress] = useState(0);

  const handleNormalUpload = async (file: File) => {
    const startTime = Date.now();
    setNormalProgress(0);
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload/normal');

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          setNormalProgress(Math.round(progress));
        }
      };

      await new Promise((resolve, reject) => {
        xhr.onload = () => resolve(xhr.response);
        xhr.onerror = () => reject(xhr.statusText);
        xhr.send(formData);
      });

      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000; // 转换为秒
      const uploadSpeed = (file.size / duration) / (1024 * 1024); // MB/s

      setNormalStats({
        startTime,
        endTime,
        fileSize: file.size,
        uploadSpeed
      });
    } catch (error) {
      console.error('普通上传失败:', error);
      alert('普通上传失败');
    }
  };

  const uploadChunkWithRetry = async (
    chunk: Blob,
    index: number,
    fileName: string,
    retryCount = 0
  ): Promise<void> => {
    try {
      const formData = new FormData();
      formData.append('chunk', chunk);
      formData.append('hash', `${fileName}-${index}`);
      formData.append('fileName', fileName);
      formData.append('index', index.toString());

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload/chunk');

      const response = await new Promise<void>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status === 200) {
            resolve();
          } else {
            reject(new Error(`分片 ${index} 上传失败: ${xhr.statusText}`));
          }
        };
        xhr.onerror = () => reject(new Error(`分片 ${index} 网络错误`));
        xhr.send(formData);
      });

      return response;
    } catch (error) {
      if (retryCount < RETRY_TIMES) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        return uploadChunkWithRetry(chunk, index, fileName, retryCount + 1);
      }
      throw error;
    }
  };

  const handleChunkUpload = async (file: File) => {
    const startTime = Date.now();
    setChunkProgress(0);

    try {
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      const chunks: { chunk: Blob; index: number }[] = [];

      // 预分配数组
      for (let index = 0; index < totalChunks; index++) {
        const start = index * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        chunks.push({
          chunk: file.slice(start, end),
          index
        });
      }

      let uploadedChunks = 0;
      const updateProgress = () => {
        uploadedChunks++;
        setChunkProgress(Math.round((uploadedChunks / totalChunks) * 100));
      };

      // 分批上传
      for (let i = 0; i < chunks.length; i += MAX_CONCURRENT_UPLOADS) {
        const batch = chunks.slice(i, i + MAX_CONCURRENT_UPLOADS);
        await Promise.all(
          batch.map(({ chunk, index }) =>
            uploadChunkWithRetry(chunk, index, file.name).then(updateProgress)
          )
        );
      }

      // 请求合并文件
      const mergeResponse = await fetch('/api/upload/merge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: file.name,
          totalChunks,
        }),
      });

      if (!mergeResponse.ok) {
        const errorData = await mergeResponse.json();
        throw new Error(errorData.error || '文件合并失败');
      }

      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      const uploadSpeed = (file.size / duration) / (1024 * 1024);

      setChunkStats({
        startTime,
        endTime,
        fileSize: file.size,
        uploadSpeed
      });
    } catch (error) {
      console.error('分片上传失败:', error);
      alert(error instanceof Error ? error.message : '上传失败');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  const formatDuration = (startTime: number, endTime: number) => {
    const duration = (endTime - startTime) / 1000;
    return duration.toFixed(2) + '秒';
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-8">
        {/* 普通上传 */}
        <div className="p-6 bg-white rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">普通上传</h3>
          <input
            type="file"
            onChange={(e) => e.target.files?.[0] && handleNormalUpload(e.target.files[0])}
            className="mb-4 block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
          {normalProgress > 0 && (
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{ width: `${normalProgress}%` }}
              />
            </div>
          )}
          {normalStats && (
            <div className="text-sm text-gray-600 space-y-1">
              <p>文件大小: {formatFileSize(normalStats.fileSize)}</p>
              <p>上传用时: {formatDuration(normalStats.startTime, normalStats.endTime)}</p>
              <p>平均速度: {normalStats.uploadSpeed.toFixed(2)} MB/s</p>
            </div>
          )}
        </div>

        {/* 分片上传 */}
        <div className="p-6 bg-white rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">分片上传</h3>
          <input
            type="file"
            onChange={(e) => e.target.files?.[0] && handleChunkUpload(e.target.files[0])}
            className="mb-4 block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-green-50 file:text-green-700
              hover:file:bg-green-100"
          />
          {chunkProgress > 0 && (
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
              <div
                className="bg-green-600 h-2.5 rounded-full"
                style={{ width: `${chunkProgress}%` }}
              />
            </div>
          )}
          {chunkStats && (
            <div className="text-sm text-gray-600 space-y-1">
              <p>文件大小: {formatFileSize(chunkStats.fileSize)}</p>
              <p>上传用时: {formatDuration(chunkStats.startTime, chunkStats.endTime)}</p>
              <p>平均速度: {chunkStats.uploadSpeed.toFixed(2)} MB/s</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-gray-50 p-6 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">上传方式对比</h4>
        <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600">
          <li>普通上传：适合小文件，一次性上传整个文件，上传失败需要重新上传</li>
          <li>分片上传：适合大文件，将文件分成小块上传，支持断点续传，某个分片失败可以重传该分片</li>
          <li>分片大小：当前设置为 {CHUNK_SIZE / (1024 * 1024)}MB，可以根据需要调整</li>
          <li>建议：文件大于 {CHUNK_SIZE / (1024 * 1024)}MB 时使用分片上传</li>
        </ul>
      </div>
    </div>
  );
}; 