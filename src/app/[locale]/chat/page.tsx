'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { motion } from 'motion/react'
import { useQueryClient } from '@tanstack/react-query'

// 自定义hooks
import { useChatMessages, useSendMessage, useChatConnection, useMessageGroups, useUploadImage } from '@/hooks/useChat'
import { useScrollManagement } from '@/hooks/useScrollManagement'
import type { ChatMessage } from '@/services/ChatService'

// 组件
import { MessageList } from '@/components/chat/MessageList'
import { MessageInput } from '@/components/chat/MessageInput'
import { ChatHeader } from '@/components/chat/ChatHeader'
import { WelcomeMessage } from '@/components/chat/WelcomeMessage'
import { LoginPrompt } from '@/components/chat/LoginPrompt'

// 消息查询键，从useChat.ts导入常量
const MESSAGES_QUERY_KEY = 'chat-messages'

export default function ChatPage() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const [showWelcome, setShowWelcome] = useState(true)
  const [newMessage, setNewMessage] = useState('')
  
  // 使用React Query处理消息数据
  const { messages, isLoading: messagesLoading, resendMessage } = useChatMessages()
  const { sendMessage, isSending } = useSendMessage(session?.user)
  const { uploadImage, isUploading } = useUploadImage(session?.user)
  const { onlineUsers, connectionStatus } = useChatConnection(session?.user)
  
  // 消息分组
  const timeGroups = useMessageGroups(messages)
  
  // 滚动管理
  const { 
    messagesEndRef, 
    messageContainerRef, 
    checkShouldAutoScroll,
    scrollToBottom,
    setAutoScroll
  } = useScrollManagement(messages)
  
  // 确保初始加载后直接定位到底部
  useEffect(() => {
    // 只在消息加载完成后执行一次
    if (messages.length > 0 && !messagesLoading) {
      // 确保DOM完全渲染后执行滚动
      const timer = setTimeout(() => {
        // 只设置消息容器的scrollTop，不使用scrollIntoView
        if (messageContainerRef.current) {
          messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
        }
        
        setAutoScroll(true);
      }, 100);
      
      return () => clearTimeout(timer);
    }
    return () => {};
  }, [messagesLoading, messages, messageContainerRef, setAutoScroll]);
  
  // 处理消息发送
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (newMessage.trim().length > 0) {
      sendMessage(newMessage.trim())
      setNewMessage('')
      
      // 确保消息发送后自动滚动到底部
      setAutoScroll(true)
      setTimeout(scrollToBottom, 100) // 延迟确保DOM已更新
    }
  }
  
  // 处理图片上传
  const handleImageUpload = (file: File) => {
    if (!session?.user) return

    uploadImage(file)
    
    // 确保上传后自动滚动到底部
    setAutoScroll(true)
    setTimeout(scrollToBottom, 100)
  }
  
  // 处理消息重发
  const handleResendMessage = (messageId: string, content: string) => {
    resendMessage(messageId, content)
    
    // 确保重发后自动滚动到底部
    setAutoScroll(true)
    setTimeout(scrollToBottom, 100)
  }
  
  // 处理图片重新上传
  const handleRetryImageUpload = (messageId: string, file: File) => {
    if (!session?.user) return
    
    // 先移除旧的失败消息
    queryClient.setQueryData<ChatMessage[]>([MESSAGES_QUERY_KEY], 
      (messages = []) => messages.filter(msg => msg.id !== messageId)
    )
    
    // 重新上传图片
    uploadImage(file)
    
    // 确保上传后自动滚动到底部
    setAutoScroll(true)
    setTimeout(scrollToBottom, 100)
  }
  
  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-indigo-50 overflow-hidden">
        {/* 动态渐变圆 */}
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/3 -left-32 w-72 h-72 bg-indigo-200/30 rounded-full blur-3xl animate-pulse delay-700"></div>
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-pink-200/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        
        {/* 装饰图案 */}
        <div className="absolute inset-0 opacity-[0.015]" 
          style={{ 
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2V6h4V4H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px'
          }}>
        </div>
      </div>

      {/* 聊天区域 */}
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl overflow-hidden border border-white/20"
        >
          {session ? (
            <div className="flex flex-col h-[calc(100vh-8rem)] overflow-x-hidden">
              {/* 聊天室标题栏 */}
              <ChatHeader 
                onlineUsers={onlineUsers} 
                connectionStatus={connectionStatus}
              />
              
              {/* 聊天介绍 */}
              {showWelcome && (
                <WelcomeMessage onDismiss={() => setShowWelcome(false)} />
              )}

              {/* 消息列表 */}
              <MessageList 
                timeGroups={timeGroups}
                currentUserId={session.user.id}
                messageContainerRef={messageContainerRef}
                messagesEndRef={messagesEndRef}
                onScroll={checkShouldAutoScroll}
                isLoading={messagesLoading}
                onResend={handleResendMessage}
                onRetryUpload={handleRetryImageUpload}
              />

              {/* 输入框 */}
              <MessageInput 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onSubmit={handleSendMessage}
                onImageUpload={handleImageUpload}
                isSending={isSending}
                isUploading={isUploading}
              />
            </div>
          ) : (
            <LoginPrompt />
          )}
        </motion.div>
      </div>
    </div>
  )
} 