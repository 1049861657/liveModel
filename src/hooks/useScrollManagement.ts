import { useState, useRef, useEffect, useCallback } from 'react';
import type { ChatMessage } from '@/services/ChatService';

export function useScrollManagement(messages: ChatMessage[]) {
  const [autoScroll, setAutoScroll] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  
  // 检查是否需要自动滚动
  const checkShouldAutoScroll = useCallback(() => {
    const container = messageContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - clientHeight - scrollTop;
    
    // 如果用户滚动到底部附近，启用自动滚动
    // 如果用户向上滚动，禁用自动滚动
    setAutoScroll(distanceFromBottom <= 50);
  }, []);
  
  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    if (!autoScroll) return;
    
    // 使用延时确保DOM已更新
    setTimeout(() => {
      // 使用容器滚动而不是scrollIntoView
      if (messageContainerRef.current) {
        messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
      }
    }, 50);
  }, [autoScroll]);
  
  // 跟踪最后一条消息ID的引用
  const lastMessageIdRef = useRef<string | null>(null);
  
  // 新消息到达时自动滚动
  useEffect(() => {
    // 不仅监听消息数量变化，还监听最新消息的ID变化
    if (messages.length === 0) return;
    
    const lastMessage = messages[messages.length - 1];
    const lastMessageId = lastMessage.id;
    
    if (autoScroll && lastMessageId !== lastMessageIdRef.current) {
      scrollToBottom();
      lastMessageIdRef.current = lastMessageId;
    }
  }, [messages, autoScroll, scrollToBottom]);
  
  return {
    autoScroll,
    messagesEndRef,
    messageContainerRef,
    checkShouldAutoScroll,
    scrollToBottom,
    setAutoScroll
  };
} 