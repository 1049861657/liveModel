"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { 
  ArrowDownTrayIcon, 
  DocumentTextIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon,
  WrenchScrewdriverIcon,
  ClipboardDocumentListIcon
} from "@heroicons/react/24/outline";
import { convertGltfModel } from "@/components/utils/gltfFix";
import type { FileWithPath } from "react-dropzone";
import { useTranslations } from 'next-intl';

// GLTF转换页面
export default function GltfFixPage() {
  const t = useTranslations('GltfFixPage');
  const t2 = useTranslations('GltfFix');

  
  const [file, setFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [convertedFile, setConvertedFile] = useState<Blob | null>(null);

  // 添加日志
  const addLog = (message: string) => {
    setLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  // 显示修复说明
  const showRepairDetails = () => {
    // 清空之前的日志
    setLog([]);
    
    // 创建说明内容数组
    const detailMessages = [
      t('details.title'),
      t('details.description'),
      t('details.process'),
      t('details.step1'),
      t('details.step2'),
      t('details.step3'),
      t('details.step4'),
      t('details.step5')
    ];
    
    // 逐一添加到日志中，每条消息间隔100ms
    detailMessages.forEach((message, index) => {
      setTimeout(() => {
        addLog(message);
      }, index * 100);
    });
  };

  // 处理文件上传
  const onDrop = useCallback(async (acceptedFiles: FileWithPath[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setFile(file);
    setConvertedFile(null);
    setError(null);
    setLog([]);
    addLog(t('logs.fileUploaded', { filename: file.name }));
  }, [t]);

  // 转换GLTF模型
  const convertModel = async () => {
    if (!file) return;

    setIsConverting(true);
    setError(null);
    setConvertedFile(null);
    addLog(t('logs.startConversion'));
    
    try {
      // 调用工具函数进行转换，传递当前语言环境
      const result = await convertGltfModel(file, t2, addLog);
      
      if (result.convertedFile) {
        setConvertedFile(result.convertedFile);
        addLog(t('logs.conversionSuccess'));
      } else if (result.error) {
        setError(result.error);
        addLog(t('logs.conversionError', { error: result.error }));
      }
    } catch (err) {
      console.error("转换模型出错:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`${t('conversionFailed')}: ${errorMessage}`);
      addLog(t('logs.error', { message: errorMessage }));
    } finally {
      setIsConverting(false);
    }
  };

  // 下载转换后的文件
  const downloadConvertedFile = () => {
    if (!convertedFile || !file) return;
    
    const fileName = file.name.replace(/\.gltf$/, '-converted.gltf');
    const url = URL.createObjectURL(convertedFile);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    addLog(t('logs.downloaded', { filename: fileName }));
  };

  // 清除文件
  const clearFile = () => {
    setFile(null);
    setConvertedFile(null);
    setError(null);
    setLog([]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'model/gltf+json': ['.gltf']
    },
    maxFiles: 1
  });

  return (
    <div className="h-full bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      {/* 顶部标题和说明区域 */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <div className="flex items-center">
          <WrenchScrewdriverIcon className="w-7 h-7 mr-3 text-blue-500" />
          <h1 className="text-2xl font-bold text-gray-800">{t('title')}</h1>
        </div>
        
        <div className="mt-3 md:mt-0 flex items-center">
          <button 
            onClick={showRepairDetails}
            className="text-blue-600 hover:text-blue-800 font-medium flex items-center text-sm"
          >
            <InformationCircleIcon className="w-5 h-5 mr-1" />
            {t('viewDetails')}
          </button>
        </div>
      </div>
      
      {/* 主要内容区域 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* 左侧：上传和操作区域 (2列) */}
        <div className="md:col-span-2 flex flex-col space-y-5">
          {/* 上传区域 - 卡片式设计 */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h2 className="text-lg font-medium text-gray-800 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                </svg>
                {t('fileUpload')}
              </h2>
            </div>
            
            <div className="p-5">
              {!file ? (
                <div 
                  {...getRootProps()} 
                  className={`border-2 border-dashed p-6 rounded-lg text-center cursor-pointer transition-all duration-200
                    flex flex-col items-center justify-center h-40 ${
                    isDragActive 
                      ? "border-blue-500 bg-blue-50" 
                      : "border-gray-200 hover:border-blue-400 hover:bg-gray-50"
                  }`}
                >
                  <input {...getInputProps()} />
                  <DocumentTextIcon className={`w-12 h-12 mb-3 ${
                    isDragActive ? "text-blue-500" : "text-gray-400"
                  }`} />
                  {isDragActive ? (
                    <p className="text-blue-500 font-medium text-base">{t('dragActive')}</p>
                  ) : (
                    <>
                      <p className="text-gray-600 text-base">{t('dragDropHint')}</p>
                      <p className="text-sm text-gray-500 mt-2">{t('formatSupport')}</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* 文件信息 */}
                  <div className="flex items-center bg-gray-50 p-3 rounded-lg">
                    <DocumentTextIcon className="w-8 h-8 text-blue-500 mr-3" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">{file.name}</p>
                      <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                    </div>
                    <button 
                      onClick={clearFile}
                      className="ml-2 text-gray-400 hover:text-gray-600"
                      title={t('removeFile')}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                      </svg>
                    </button>
                  </div>
                  
                  {/* 操作按钮 */}
                  <div className="flex space-x-3">
                    {!convertedFile && !error && (
                      <button
                        onClick={convertModel}
                        disabled={isConverting}
                        className={`px-4 py-2.5 rounded-lg text-base font-medium flex-1 flex items-center justify-center ${
                          isConverting 
                            ? "bg-gray-400 cursor-not-allowed text-white" 
                            : "bg-blue-500 hover:bg-blue-600 text-white shadow-sm hover:shadow transition-all"
                        }`}
                      >
                        {isConverting ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            {t('converting')}
                          </>
                        ) : t('startRepair')}
                      </button>
                    )}
                    
                    {convertedFile && (
                      <button
                        onClick={downloadConvertedFile}
                        className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-base font-medium flex items-center justify-center shadow-sm hover:shadow transition-all flex-1"
                      >
                        <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
                        {t('downloadFile')}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 状态提示区域 */}
          {file && error && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 bg-red-50 border-l-4 border-red-500">
                <div className="flex items-start">
                  <ExclamationTriangleIcon className="w-6 h-6 mr-3 text-red-500 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-red-800 text-base">{t('conversionFailed')}</p>
                    <p className="mt-1 text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {file && convertedFile && !error && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 bg-green-50 border-l-4 border-green-500">
                <div className="flex items-center">
                  <svg className="w-6 h-6 mr-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <div className="flex-1">
                    <p className="font-medium text-green-800 text-base">{t('conversionSuccess')}</p>
                    <p className="text-sm text-green-700">{t('fileReady')}</p>
                  </div>
                  <span className="text-sm text-green-700 bg-green-100 px-3 py-1 rounded-full">{(convertedFile.size / 1024).toFixed(2)} KB</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 右侧：日志区域 (3列) */}
        <div className="md:col-span-3 bg-white rounded-xl shadow-sm overflow-hidden flex flex-col h-[500px]">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-800 flex items-center">
              <ClipboardDocumentListIcon className="w-5 h-5 mr-2 text-gray-600" />
              {t('logName')}
            </h2>
            {log.length > 0 && (
              <button 
                onClick={() => setLog([])}
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1 hover:bg-gray-100 rounded-md transition-colors"
              >
                {t('clearLogs')}
              </button>
            )}
          </div>
          
          <div className="flex-1 overflow-hidden">
            <div className="h-full bg-gray-900 text-green-400 p-4 rounded-lg m-2 overflow-y-auto font-mono text-sm scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
              {log.length > 0 ? (
                log.map((entry, index) => (
                  <div key={index} className="py-0.5 px-2">{entry}</div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center">
                  <div className="w-24 h-24 mb-4 relative">
                    <div className="absolute inset-0 border-4 border-dashed rounded-full border-gray-700 animate-spin-slow"></div>
                    <div className="absolute inset-4 border-4 border-dashed rounded-full border-gray-600 animate-spin-slow-reverse"></div>
                    <div className="absolute inset-8 border-4 border-dashed rounded-full border-gray-500 animate-spin-slow"></div>
                  </div>
                  <p className="text-gray-500 text-center">
                    <span className="block mb-2 text-lg font-medium">{t('waitingOperation')}</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 添加自定义动画样式和滚动条样式 */}
      <style jsx global>{`
        @keyframes spin-slow {
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes spin-slow-reverse {
          to {
            transform: rotate(-360deg);
          }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
        .animate-spin-slow-reverse {
          animation: spin-slow-reverse 6s linear infinite;
        }
        
        /* 自定义滚动条样式 */
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }
        .scrollbar-thumb-gray-700::-webkit-scrollbar-thumb {
          background-color: #4B5563;
          border-radius: 3px;
        }
        .scrollbar-track-gray-900::-webkit-scrollbar-track {
          background-color: #111827;
        }
      `}</style>
    </div>
  );
} 