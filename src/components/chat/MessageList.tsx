'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useTranslations } from 'next-intl'
import Avatar from '@/components/ui/Avatar'
import { formatMessageTime } from '@/lib/date'
import type { ChatMessage } from '@/services/ChatService'

interface TimeGroup {
  id: string;
  time: Date;
  messages: ChatMessage[];
}

interface MessageListProps {
  timeGroups: TimeGroup[];
  currentUserId?: string;
  messageContainerRef: React.RefObject<HTMLDivElement>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  onScroll: () => void;
  isLoading?: boolean;
  onResend?: (messageId: string, content: string) => void;
}

export function MessageList({ 
  timeGroups, 
  currentUserId,
  messageContainerRef,
  messagesEndRef,
  onScroll,
  isLoading = false,
  onResend
}: MessageListProps) {
  const t = useTranslations('ChatPage');

  return (
    <div 
      ref={messageContainerRef}
      className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-4 space-y-8"
      onScroll={onScroll}
    >
      {isLoading && timeGroups.length === 0 ? (
        <div className="flex justify-center items-center h-full">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <AnimatePresence initial={false}>
          {timeGroups.map((group) => (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* 时间戳 */}
              <div className="flex justify-center">
                <span className="px-3 py-1 text-xs text-gray-500 bg-gray-100/80 rounded-full">
                  {formatMessageTime(group.time)}
                </span>
              </div>

              {/* 消息列表 */}
              <div className="space-y-4">
                {group.messages.map((message) => (
                  <div key={message.id} className="space-y-2">
                    {/* 用户信息 */}
                    <div className={`flex items-center space-x-2 ${
                      message.user.id === currentUserId ? 'flex-row-reverse space-x-reverse' : ''
                    }`}>
                      <Avatar user={message.user} size="sm" />
                      <span className="text-sm font-medium text-gray-700">
                        {message.user.name ?? t('defaultUsername')}
                      </span>
                    </div>

                    {/* 消息内容 */}
                    <div className={`${
                      message.user.id === currentUserId 
                        ? 'flex flex-row-reverse items-center gap-2' 
                        : 'flex flex-row items-center gap-2 pl-10'
                    }`}>
                      {/* 消息气泡 */}
                      <div className={`max-w-[70%] overflow-hidden ${
                        message.user.id === currentUserId 
                          ? 'bg-gradient-to-br from-indigo-400 to-purple-400 text-white' 
                          : 'bg-gray-100 text-gray-800'
                      } rounded-2xl px-4 py-2 shadow-sm`}>
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                      </div>
                      
                      {/* 发送状态指示器 - 仅对当前用户的消息显示，放在气泡左边 */}
                      {message.user.id === currentUserId && message.isLoading && (
                        <div className="flex-shrink-0 flex items-center space-x-0.5 h-4">
                          <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse"></div>
                          <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse delay-150"></div>
                          <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse delay-300"></div>
                        </div>
                      )}
                      
                      {/* 重发按钮 - 仅对当前用户的失败消息显示 */}
                      {message.user.id === currentUserId && message.isFailed && (
                        <button 
                          onClick={() => onResend?.(message.id, message.content)}
                          className="flex-shrink-0 w-5 h-5 bg-red-500/80 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                            <path fillRule="evenodd" d="M10 4.5c1.215 0 2.417.055 3.604.162a.68.68 0 01.615.597c.124 1.038.208 2.088.25 3.15l-1.689-1.69a.75.75 0 00-1.06 1.061l2.999 3a.75.75 0 001.06 0l3.001-3a.75.75 0 10-1.06-1.06l-1.748 1.747a41.31 41.31 0 00-.258-3.386 2.18 2.18 0 00-1.97-1.913A41.512 41.512 0 0010 3a.75.75 0 000 1.5zm-4.5 9.5a3 3 0 100-6 3 3 0 000 6zm9 0a3 3 0 100-6 3 3 0 000 6zm-9 1.5a4.5 4.5 0 110-9 4.5 4.5 0 010 9zm9 0a4.5 4.5 0 110-9 4.5 4.5 0 010 9z" clipRule="evenodd" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      )}

      {/* 用于自动滚动的引用元素 */}
      <div ref={messagesEndRef} />
    </div>
  );
} 