'use client'

import { useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { XMarkIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'

interface ImageViewerProps {
  imageUrl: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ImageViewer({ imageUrl, isOpen, onClose }: ImageViewerProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [isSmallImage, setIsSmallImage] = useState(false);
  
  // 处理点击事件，如果点击的是遮罩层而不是图片，则关闭查看器
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };
  
  // 处理下载图片
  const handleDownload = () => {
    // 创建一个临时的a标签来处理下载
    const link = document.createElement('a');
    link.href = imageUrl;
    // 从URL中提取文件名，如果无法提取则使用timestamp
    const fileName = imageUrl.split('/').pop() || `image-${Date.now()}.jpg`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // 处理ESC键关闭
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscKey);
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, onClose]);

  // 检测图片尺寸并设置按钮样式
  useEffect(() => {
    if (isOpen && imageRef.current) {
      const checkImageSize = () => {
        const img = imageRef.current;
        if (img) {
          // 如果图片宽度或高度小于200px，则视为小图片
          setIsSmallImage(img.naturalWidth < 200 || img.naturalHeight < 200);
        }
      };
      
      // 图片加载完成后检查尺寸
      if (imageRef.current.complete) {
        checkImageSize();
      } else {
        imageRef.current.onload = checkImageSize;
      }
    }
  }, [isOpen, imageUrl]);

  // 根据图片大小调整按钮样式
  const buttonSize = isSmallImage ? "w-6 h-6" : "w-8 h-8";
  const iconSize = isSmallImage ? "w-4 h-4" : "w-5 h-5";
  
  // 调整按钮位置
  const buttonPosition = isSmallImage ? "top-1 right-1 space-x-1" : "top-2 right-2 space-x-2";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={overlayRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={handleOverlayClick}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative max-w-[90vw] max-h-[90vh] overflow-auto bg-white/10 rounded-lg p-1 shadow-2xl"
          >
            {/* 控制按钮区域 */}
            <div className={`absolute z-10 flex ${buttonPosition}`}>
              {/* 下载按钮 */}
              <button
                onClick={handleDownload}
                className={`${buttonSize} bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors`}
              >
                <ArrowDownTrayIcon className={iconSize} />
              </button>
              
              {/* 关闭按钮 */}
              <button
                onClick={onClose}
                className={`${buttonSize} bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors`}
              >
                <XMarkIcon className={iconSize} />
              </button>
            </div>
            
            {/* 图片容器 */}
            <div className="relative">
              <img 
                ref={imageRef}
                src={imageUrl} 
                alt="原始图片"
                className="max-w-full max-h-[85vh] object-contain"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}