'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useTranslations } from 'next-intl'
import Avatar from '@/components/ui/Avatar'
import { formatMessageTime } from '@/lib/date'
import type { ChatMessage } from '@/services/ChatService'
import Image from 'next/image'
import { useMemo, useState } from 'react'
import { emojiCategories } from '@/config/emojis'
import { ImageViewer } from './ImageViewer'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'

// 解析梗图标记的正则表达式
const MEME_REGEX = /\{\{meme:(.*?)\}\}/g;

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
  onRetryUpload?: (messageId: string, file: File) => void;
}

// 渲染消息内容，解析梗图标记
function MessageContent({ content, type = 'text' }: { content: string; type?: string }) {
  const [isHovering, setIsHovering] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  
  // 如果是图片消息，直接显示图片
  if (type === 'image') {
    return (
      <div className="relative">
        <div
          className="relative"
          onMouseEnter={() => setIsHovering(true)} 
          onMouseLeave={() => setIsHovering(false)}
        >
          <Image 
            src={content} 
            alt="图片消息"
            width={240}
            height={180}
            style={{ width: 'auto', height: 'auto', maxWidth: '100%' }}
            className="rounded-lg cursor-pointer"
            onClick={() => setIsViewerOpen(true)}
          />
          
          {isHovering && (
            <div className="absolute inset-0 bg-black/30 rounded-lg flex items-center justify-center">
              <button
                onClick={() => setIsViewerOpen(true)}
                className="p-2 bg-white/20 rounded-full backdrop-blur-sm hover:bg-white/40 transition-colors"
              >
                <MagnifyingGlassIcon className="w-6 h-6 text-white" />
              </button>
            </div>
          )}
        </div>
        
        {/* 图片查看器 */}
        <ImageViewer 
          imageUrl={content}
          isOpen={isViewerOpen}
          onClose={() => setIsViewerOpen(false)}
        />
      </div>
    );
  }
  
  // 使用useMemo缓存解析结果
  const parsedContent = useMemo(() => {
    // 检查消息是否包含梗图标记
    if (!content.includes('{{meme:')) {
      return <p className="text-sm whitespace-pre-wrap break-words">{content}</p>;
    }

    // 解析消息内容，提取梗图标记
    const parts = [];
    let lastIndex = 0;
    let match;

    // 重置正则表达式
    MEME_REGEX.lastIndex = 0;
    
    // 查找所有梗图标记
    while ((match = MEME_REGEX.exec(content)) !== null) {
      // 添加梗图标记前的文本
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {content.substring(lastIndex, match.index)}
          </span>
        );
      }

      // 提取梗图名称
      const memeName = match[1];
      
      // 从emoji配置中查找对应的URL
      const memeEmoji = emojiCategories
        .find((cat) => cat.key === "meme")
        ?.emojis.find((e) => e.emoji === `{{meme:${memeName}}}`);
      
      if (memeEmoji?.url) {
        // 添加梗图
        parts.push(
          <span key={`image-${match.index}`} className="inline-block align-bottom mx-1">
            <div className="relative w-16 h-auto rounded-lg">
              <Image 
                src={memeEmoji.url} 
                alt={memeName}
                width={64}
                height={64}
                style={{ width: 'auto', height: 'auto' }}
                className="rounded-lg"
              />
            </div>
          </span>
        );
      } else {
        // 如果找不到对应的梗图，显示原文本
        parts.push(
          <span key={`unknown-${match.index}`}>
            {match[0]}
          </span>
        );
      }

      lastIndex = match.index + match[0].length;
    }

    // 添加最后一部分文本
    if (lastIndex < content.length) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {content.substring(lastIndex)}
        </span>
      );
    }

    return <div className="text-sm whitespace-pre-wrap break-words flex items-end flex-wrap">{parts}</div>;
  }, [content]);

  return parsedContent;
}

export function MessageList({ 
  timeGroups, 
  currentUserId,
  messageContainerRef,
  messagesEndRef,
  onScroll,
  isLoading = false,
  onResend,
  onRetryUpload
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
                        <MessageContent content={message.content} type={message.type} />
                      </div>
                      
                      {/* 发送状态指示器 - 仅对当前用户的消息显示，放在气泡左边 */}
                      {message.user.id === currentUserId && message.isLoading && (
                        <div className="flex-shrink-0 flex items-center space-x-0.5 h-4">
                          <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse"></div>
                          <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse delay-150"></div>
                          <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse delay-300"></div>
                        </div>
                      )}
                      
                      {/* 重发按钮 - 仅对当前用户的失败消息显示，且不是图片上传失败的消息 */}
                      {message.user.id === currentUserId && message.isFailed && !message.originalFile && (
                        <button 
                          onClick={() => onResend?.(message.id, message.content)}
                          className="flex-shrink-0 w-5 h-5 bg-red-500/80 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                            <path fillRule="evenodd" d="M10 4.5c1.215 0 2.417.055 3.604.162a.68.68 0 01.615.597c.124 1.038.208 2.088.25 3.15l-1.689-1.69a.75.75 0 00-1.06 1.061l2.999 3a.75.75 0 001.06 0l3.001-3a.75.75 0 10-1.06-1.06l-1.748 1.747a41.31 41.31 0 00-.258-3.386 2.18 2.18 0 00-1.97-1.913A41.512 41.512 0 0010 3a.75.75 0 000 1.5zm-4.5 9.5a3 3 0 100-6 3 3 0 000 6zm9 0a3 3 0 100-6 3 3 0 000 6zm-9 1.5a4.5 4.5 0 110-9 4.5 4.5 0 010 9zm9 0a4.5 4.5 0 110-9 4.5 4.5 0 010 9z" clipRule="evenodd" />
                          </svg>
                        </button>
                      )}
                      
                      {/* 图片重新上传按钮 - 仅对当前用户的图片上传失败消息显示 */}
                      {message.user.id === currentUserId && message.isFailed && message.originalFile && (
                        <button 
                          onClick={() => onRetryUpload?.(message.id, message.originalFile)}
                          className="flex-shrink-0 w-5 h-5 bg-red-500/80 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                            <path d="M9.25 13.25a.75.75 0 001.5 0V4.636l2.955 3.129a.75.75 0 001.09-1.03l-4.25-4.5a.75.75 0 00-1.09 0l-4.25 4.5a.75.75 0 101.09 1.03L9.25 4.636v8.614z" />
                            <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
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