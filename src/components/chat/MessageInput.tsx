'use client'

import { useTranslations } from 'next-intl'
import { useRef } from 'react'
import { EmojiPicker } from './EmojiPicker'

interface MessageInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onImageUpload?: (file: File) => void;
  isSending?: boolean;
  disabled?: boolean;
  isUploading?: boolean;
}

export function MessageInput({ 
  value, 
  onChange, 
  onSubmit, 
  onImageUpload,
  isSending = false,
  disabled = false,
  isUploading = false
}: MessageInputProps) {
  const t = useTranslations('ChatPage');
  const canSend = !disabled && !isSending && value.trim().length > 0;
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 插入表情到当前光标位置
  const handleEmojiSelect = (emoji: string) => {
    if (inputRef.current) {
      const start = inputRef.current.selectionStart || 0;
      const end = inputRef.current.selectionEnd || 0;
      
      // 创建新的文本值（在光标位置插入表情）
      const newValue = value.substring(0, start) + emoji + value.substring(end);
      
      // 创建一个合成事件对象来模拟onChange
      const syntheticEvent = {
        target: {
          value: newValue
        }
      } as React.ChangeEvent<HTMLInputElement>;
      
      // 调用onChange函数
      onChange(syntheticEvent);
      
      // 设置光标位置
      setTimeout(() => {
        if (inputRef.current) {
          const newCursorPos = start + emoji.length;
          inputRef.current.focus();
          inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    }
  };

  // 处理图片选择
  const handleImageSelect = () => {
    fileInputRef.current?.click();
  };
  
  // 处理文件变更
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && onImageUpload) {
      onImageUpload(files[0]);
      // 清除选择的文件，允许重复选择同一文件
      e.target.value = '';
    }
  };

  return (
    <form onSubmit={onSubmit} className="p-4 border-t bg-white overflow-hidden w-full">
      {/* 输入区域容器 */}
      <div className="bg-gray-50 rounded-2xl p-2 shadow-sm">
        {/* 功能按钮区 - 为未来功能预留空间 */}
        <div className="flex items-center px-1 mb-2 gap-1">
          <div className="flex items-center space-x-1">
            <EmojiPicker onSelectEmoji={handleEmojiSelect} />
            
            {/* 图片上传按钮 */}
            <button
              type="button"
              onClick={handleImageSelect}
              disabled={disabled || isUploading}
              className="relative p-1.5 hover:bg-purple-100 rounded-full transition-colors focus:outline-none group"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-600 group-hover:text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {isUploading && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></span>
                </span>
              )}
            </button>
            
            {/* 隐藏的文件输入 */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
              disabled={disabled || isUploading}
            />
            
            <div className="w-6 h-6"></div>
          </div>
        </div>
        
        {/* 输入框和发送按钮 */}
        <div className="flex space-x-2 items-center">
          <input
            type="text"
            value={value}
            onChange={onChange}
            disabled={disabled}
            ref={inputRef}
            placeholder={t('input.placeholder')}
            className="flex-1 min-w-0 rounded-xl border border-gray-200 bg-white px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-purple-400 focus:border-purple-400 text-sm"
          />
          <button
            type="submit"
            disabled={!canSend}
            className={`p-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-medium transition-all duration-200 disabled:opacity-50 shrink-0 min-w-[4rem]
              ${canSend ? 'hover:shadow-md hover:shadow-purple-200 hover:from-purple-600 hover:to-indigo-600' : ''}
            `}
          >
            {isSending ? (
              <span className="flex items-center justify-center">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              </span>
            ) : (
              <span>{t('input.send')}</span>
            )}
          </button>
        </div>
      </div>
    </form>
  );
} 