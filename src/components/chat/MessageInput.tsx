'use client'

import { useTranslations } from 'next-intl'
import { useRef } from 'react'
import { EmojiPicker } from './EmojiPicker'

interface MessageInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSending?: boolean;
  disabled?: boolean;
}

export function MessageInput({ 
  value, 
  onChange, 
  onSubmit, 
  isSending = false,
  disabled = false
}: MessageInputProps) {
  const t = useTranslations('ChatPage');
  const canSend = !disabled && !isSending && value.trim().length > 0;
  const inputRef = useRef<HTMLInputElement>(null);

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

  return (
    <form onSubmit={onSubmit} className="p-4 border-t bg-white overflow-hidden w-full">
      {/* 输入区域容器 */}
      <div className="bg-gray-50 rounded-2xl p-2 shadow-sm">
        {/* 功能按钮区 - 为未来功能预留空间 */}
        <div className="flex items-center px-1 mb-2 gap-1">
          <div className="flex items-center space-x-1">
            <EmojiPicker onSelectEmoji={handleEmojiSelect} />
            {/* 未来可添加其他功能按钮 */}
            <div className="w-6 h-6"></div>
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