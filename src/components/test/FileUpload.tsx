'use client'

import React, { useState, useCallback } from 'react';

interface ChunkInfo {
  chunk: Blob;
  hash: string;
  index: number;
}

const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB per chunk

export const FileUpload: React.FC = () => {
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const createChunks = (file: File): ChunkInfo[] => {
    const chunks: ChunkInfo[] = [];
    let start = 0;

    while (start < file.size) {
      const chunk = file.slice(start, start + CHUNK_SIZE);
      chunks.push({
        chunk,
        hash: `${file.name}-${start}`,
        index: chunks.length
      });
      start += CHUNK_SIZE;
    }
    return chunks;
  };

  const uploadChunk = async (chunk: ChunkInfo, fileName: string): Promise<void> => {
    const formData = new FormData();
    formData.append('chunk', chunk.chunk);
    formData.append('hash', chunk.hash);
    formData.append('index', chunk.index.toString());
    formData.append('fileName', fileName);

    await fetch('/api/upload/chunk', {
      method: 'POST',
      body: formData,
    });
  };

  const mergeChunks = async (fileName: string, totalChunks: number): Promise<void> => {
    await fetch('/api/upload/merge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName,
        totalChunks,
      }),
    });
  };

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const chunks = createChunks(file);
    const totalChunks = chunks.length;

    try {
      for (let i = 0; i < chunks.length; i++) {
        await uploadChunk(chunks[i], file.name);
        setUploadProgress(Math.round(((i + 1) / totalChunks) * 100));
      }

      await mergeChunks(file.name, totalChunks);
      alert('文件上传成功！');
    } catch (error) {
      console.error('上传失败:', error);
      alert('文件上传失败，请重试！');
    }
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <input
        type="file"
        onChange={handleFileChange}
        className="block w-full text-sm text-gray-500
          file:mr-4 file:py-2 file:px-4
          file:rounded-full file:border-0
          file:text-sm file:font-semibold
          file:bg-blue-50 file:text-blue-700
          hover:file:bg-blue-100"
      />
      {uploadProgress > 0 && (
        <div className="w-full max-w-md">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            上传进度: {uploadProgress}%
          </p>
        </div>
      )}
    </div>
  );
}; 