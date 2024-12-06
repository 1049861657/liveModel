'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { format } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-hot-toast'

interface ChatMessage {
  id: string
  content: string
  type: 'text' | 'image'
  createdAt: Date
  user: {
    id: string
    name: string | null
    email: string
  }
  isLoading?: boolean
}

interface GroupedMessage {
  id: string;
  messages: ChatMessage[];
  showTime: boolean;
}

export default function ChatPage() {
  const { data: session } = useSession()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const [showWelcome, setShowWelcome] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageContainerRef = useRef<HTMLDivElement>(null)
  const ws = useRef<WebSocket | null>(null)
  const [onlineUsers, setOnlineUsers] = useState(0)

  // 检查是否可以发送消息
  const canSendMessage = newMessage.trim().length > 0 && !loading;

  // 对消息进行分组和时间显示处理
  const groupedMessages = useMemo(() => {
    const groups: GroupedMessage[] = [];
    let currentGroup: ChatMessage[] = [];
    let lastTime = new Date(0);
    let lastUserId = '';

    messages.forEach((message, index) => {
      const messageTime = new Date(message.createdAt);
      const timeDiff = (messageTime.getTime() - lastTime.getTime()) / (1000 * 60); // 转换为分钟

      // 如果是新用户或者时间间隔超过5分钟，创建新组
      if (message.user.id !== lastUserId || timeDiff > 5) {
        if (currentGroup.length > 0) {
          groups.push({
            id: currentGroup[0].id,
            messages: currentGroup,
            showTime: timeDiff > 5
          });
        }
        currentGroup = [message];
      } else {
        currentGroup.push(message);
      }

      // 处理最后一条消息
      if (index === messages.length - 1) {
        groups.push({
          id: currentGroup[0].id,
          messages: currentGroup,
          showTime: index === 0 || timeDiff > 5 // 确保第一组消息显示时间
        });
      }

      lastTime = messageTime;
      lastUserId = message.user.id;
    });

    return groups;
  }, [messages]);

  // 检查是否需要自动滚���
  const checkShouldAutoScroll = () => {
    const container = messageContainerRef.current
    if (!container) return

    const { scrollTop, scrollHeight, clientHeight } = container
    const distanceFromBottom = scrollHeight - clientHeight - scrollTop
    const shouldAutoScroll = distanceFromBottom <= 50

    setAutoScroll(shouldAutoScroll)
  }

  // 滚动到底部
  const scrollToBottom = () => {
    if (!autoScroll) {
      return
    }
    messagesEndRef.current?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'end'
    })
  }

  // 加载消息
  const fetchMessages = async () => {
    try {
      const response = await fetch('/api/chat/messages')
      if (!response.ok) throw new Error('获取消息失败')
      const data = await response.json()
      setMessages(data.messages)
      setTimeout(scrollToBottom, 100) // 等待DOM更新后滚动
    } catch (error) {
      console.error('获取消息失败:', error)
      toast.error('获取消息失败')
    }
  }

  // 发送消息
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session) {
      toast.error('请登录')
      return
    }
    if (!newMessage.trim()) return
    setLoading(true)

    try {
      // 创建一个临时的加载状态消息
      const tempMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        content: newMessage.trim(),
        type: 'text',
        createdAt: new Date(),
        user: {
          id: session.user.id,
          name: session.user.name ?? null,
          email: session.user.email!
        },
        isLoading: true
      }

      // 添加临时消息到消息列表
      setMessages(prev => [...prev, tempMessage])
      setNewMessage('')
      setAutoScroll(true)
      setTimeout(scrollToBottom, 50)

      // 发送消息
      ws.current?.send(JSON.stringify({
        type: 'text',
        content: tempMessage.content
      }))
    } catch (error) {
      toast.error('发送失败')
    } finally {
      setLoading(false)
    }
  }

  // WebSocket 连接
  useEffect(() => {
    let retryCount = 0
    const maxRetries = 3
    const retryDelay = 1000
    const initialDelay = 500

    const connectWebSocket = () => {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 
        `ws://${window.location.hostname}:3001`
      
      console.log('正在连接到WebSocket服务器:', wsUrl)
      
      const checkServerAndConnect = () => {
        try {
          const socket = new WebSocket(wsUrl)
          ws.current = socket

          socket.onopen = () => {
            console.log('WebSocket 连接成功，发送认证消息')
            
            if (!session?.user?.email) {
              console.error('未找到用户信息')
              toast.error('会话已过期，请重新登录')
              socket.close()
              return
            }

            const authMessage = {
              type: 'auth',
              user: {
                id: session.user.id,
                email: session.user.email,
                name: session.user.name
              }
            }
            socket.send(JSON.stringify(authMessage))
          }

          socket.onmessage = (event) => {
            try {
              const message = JSON.parse(event.data)
              if (message.type === 'auth_result') {
                if (message.success) {
                  retryCount = 0
                  if (message.onlineUsers) {
                    setOnlineUsers(message.onlineUsers)
                  }
                } else {
                  toast.error('聊天室连接失败，请重新登录')
                  socket.close()
                }
                return
              }
              if (message.type === 'online_users') {
                setOnlineUsers(message.count)
                return
              }

              // 立即移除所有加载状态的消息并添加新消息
              setMessages(prev => {
                const filtered = prev.filter(m => !m.isLoading)
                return [...filtered, message]
              })

              // 如果是自己发的消息，��定滚动
              if (message.user?.id === session?.user?.id) {
                messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })
              } else {
                // 如果是别人的消息，检查滚动条是否在底部
                const container = messageContainerRef.current
                if (container) {
                  const { scrollTop, scrollHeight, clientHeight } = container
                  const isAtBottom = (scrollHeight - clientHeight - scrollTop) <= 50
                  if (isAtBottom) {
                    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })
                  }
                }
              }
            } catch (error) {
              console.error('解析消息失败:', error)
            }
          }

          socket.onerror = (error) => {
            console.error('WebSocket 错误:', error)
            if (retryCount < maxRetries) {
              retryCount++
              setTimeout(connectWebSocket, retryDelay)
            } else {
              toast.error('连接失败，请检查网络后刷新重试')
            }
          }

          socket.onclose = (event) => {
            if (retryCount < maxRetries && event.code !== 1000) {
              retryCount++
              setTimeout(connectWebSocket, retryDelay)
            }
          }
        } catch (error) {
          console.error('创建 WebSocket 连接失败:', error)
          toast.error('创建连接失败，请检查网络设置')
        }
      }

      if (retryCount === 0) {
        setTimeout(checkServerAndConnect, initialDelay)
      } else {
        checkServerAndConnect()
      }
    }

    if (session?.user) {
      console.log('用户已登录，开始连接 WebSocket')
      connectWebSocket()
    } else {
      console.log('用户未登录，不连接 WebSocket')
    }

    return () => {
      if (ws.current) {
        ws.current.close()
      }
    }
  }, [session])

  // 初始加载消息
  useEffect(() => {
    if (session) {
      fetchMessages()
    }
  }, [session])

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
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
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
            <div className="flex flex-col h-[calc(100vh-8rem)]">
              {/* 聊天室标题栏 */}
              <div className="flex items-center justify-between px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                <div className="flex items-center space-x-4">
                  <div>
                    <h2 className="text-xl font-bold">世界聊天室</h2>
                    <p className="text-sm text-purple-200">在线用户交流讨论</p>
                  </div>
                  <div className="flex items-center space-x-1 bg-white/10 rounded-full px-3 py-1">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                    <span className="text-xs text-purple-100">
                      {onlineUsers} 人在线
                    </span>
                  </div>
                </div>
              </div>

              {/* 聊天介绍 - 添加关闭功能 */}
              {showWelcome && (
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 px-6 py-3 text-sm text-gray-600 border-b border-purple-100/20 relative">
                  <div className="flex items-center pr-8">
                    <svg className="w-4 h-4 mr-2 text-purple-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p>欢迎来到世界聊天室！这里是一个开放的交流空间，您可以与其他用户分享想法、讨论技术，结交志同道合的朋友。</p>
                  </div>
                  <button 
                    onClick={() => setShowWelcome(false)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              {/* 消息列表 */}
              <div 
                ref={messageContainerRef}
                className="flex-1 overflow-y-auto px-6 py-4 space-y-8"
                onScroll={checkShouldAutoScroll}
              >
                <AnimatePresence initial={false}>
                  {groupedMessages.map((group, groupIndex) => (
                    <motion.div
                      key={group.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="space-y-2"
                    >
                      {/* 时间显示 */}
                      {(groupIndex === 0 || group.showTime) && (
                        <div className="flex justify-center">
                          <span className="text-xs text-gray-400 bg-gray-50 px-3 py-1 rounded-full">
                            {format(new Date(group.messages[0].createdAt), 'HH:mm')}
                          </span>
                        </div>
                      )}

                      {/* 用户信息 */}
                      <div className={`flex items-center space-x-2 mb-1 ${
                        group.messages[0].user.id === session?.user?.id ? 'flex-row-reverse space-x-reverse' : ''
                      }`}>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white text-sm">
                          {group.messages[0].user.name?.[0] || group.messages[0].user.email[0]}
                        </div>
                        <span className="text-sm font-medium text-gray-700">
                          {group.messages[0].user.name || '用户'}
                        </span>
                      </div>

                      {/* 消息组 */}
                      <div className={`space-y-1 ${
                        group.messages[0].user.id === session?.user?.id ? 'flex flex-col items-end' : 'flex flex-col items-start pl-10'
                      }`}>
                        {group.messages.map((message) => (
                          <div
                            key={message.id}
                            className={`max-w-[70%] ${
                              message.user.id === session?.user?.id 
                                ? 'bg-gradient-to-br from-indigo-400 to-purple-400 text-white' 
                                : 'bg-gray-100 text-gray-800'
                            } rounded-2xl px-4 py-2 shadow-sm relative`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {message.content}
                            </p>
                            {message.isLoading && (
                              <div className="absolute right-0 top-0 -mr-6 mt-2">
                                <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>

              {/* 输入框 */}
              <form onSubmit={sendMessage} className="p-4 border-t bg-white">
                <div className="flex space-x-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="输入消息..."
                    className="flex-1 rounded-xl border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={!canSendMessage}
                    className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-200 disabled:opacity-50 text-sm"
                  >
                    发送
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="h-[calc(100vh-8rem)] flex items-center justify-center">
              <div className="text-center px-4">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
                  <svg 
                    className="w-10 h-10 text-white"
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={1.5} 
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
                    />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  欢迎来到世界聊天室
                </h3>
                <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                  登录后即可与其他创作者交流，分享你的想法和作品
                </p>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <a
                    href="/login"
                    className="inline-flex items-center px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 transition-all duration-200"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    立即登录
                  </a>
                </motion.div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
} 