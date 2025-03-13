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
}

export function MessageList({ 
  timeGroups, 
  currentUserId,
  messageContainerRef,
  messagesEndRef,
  onScroll,
  isLoading = false
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
                        ? 'flex flex-col items-end' 
                        : 'flex flex-col items-start pl-10'
                    }`}>
                      <div className={`max-w-[70%] overflow-hidden ${
                        message.user.id === currentUserId 
                          ? 'bg-gradient-to-br from-indigo-400 to-purple-400 text-white' 
                          : 'bg-gray-100 text-gray-800'
                      } rounded-2xl px-4 py-2 shadow-sm relative`}>
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                        {message.isLoading && (
                          <div className="absolute right-0 top-0 -mr-6 mt-2">
                            <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        )}
                      </div>
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