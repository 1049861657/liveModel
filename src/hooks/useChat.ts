import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import chatService, { type ChatMessage } from '@/services/ChatService';

// 消息查询键
const MESSAGES_QUERY_KEY = 'chat-messages';

/**
 * 获取聊天消息的Hook
 */
export function useChatMessages() {
  const queryClient = useQueryClient();
  
  // 获取消息
  const { data: messages = [], isLoading, error: _error } = useQuery({
    queryKey: [MESSAGES_QUERY_KEY],
    queryFn: () => chatService.fetchMessages(),
    // 实时聊天不需要自动刷新，我们会通过WebSocket更新
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });
  
  // 添加新消息的方法 (供WebSocket回调使用)
  const addMessage = useCallback((newMessage: ChatMessage) => {
    queryClient.setQueryData<ChatMessage[]>([MESSAGES_QUERY_KEY], (oldData = []) => {
      const filtered = oldData.filter(m => !m.isLoading);
      const messageExists = filtered.some(m => m.id === newMessage.id);
      if (messageExists) return filtered;
      return [...filtered, newMessage];
    });
  }, [queryClient]);

  // 重新发送消息
  const resendMessage = useCallback((failedMessageId: string, content: string) => {
    // 先更新消息状态为加载中
    queryClient.setQueryData<ChatMessage[]>([MESSAGES_QUERY_KEY], (oldData = []) => {
      return oldData.map(msg => 
        msg.id === failedMessageId
          ? { ...msg, isLoading: true, isFailed: false }
          : msg
      );
    });

    // 发送消息
    chatService.sendMessage(content)
      .then(() => {
        // 发送成功后移除失败消息
        queryClient.setQueryData<ChatMessage[]>([MESSAGES_QUERY_KEY], (oldData = []) => {
          return oldData.filter(msg => msg.id !== failedMessageId);
        });
      })
      .catch(error => {
        // 发送失败，恢复失败状态
        console.error('[重发消息失败]:', error);
        queryClient.setQueryData<ChatMessage[]>([MESSAGES_QUERY_KEY], (oldData = []) => {
          return oldData.map(msg => 
            msg.id === failedMessageId
              ? { ...msg, isLoading: false, isFailed: true }
              : msg
          );
        });
        toast.error('重发消息失败，请稍后再试');
      });
  }, [queryClient]);
  
  return {
    messages,
    isLoading,
    addMessage,
    resendMessage
  };
}

/**
 * 发送消息的Hook
 */
export function useSendMessage(user: any) {
  const queryClient = useQueryClient();
  
  const { mutate: sendMessage, isPending: isSending } = useMutation({
    mutationFn: (content: string) => chatService.sendMessage(content),
    onMutate: async (content: string) => {
      // 取消任何传出的重新获取，这样它们不会覆盖我们的乐观更新
      await queryClient.cancelQueries({ queryKey: [MESSAGES_QUERY_KEY] });
      
      if (!user?.id) return;
      
      // 创建临时消息，使用完整的用户信息
      const tempMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        content: content.trim(),
        type: 'text',
        createdAt: new Date(),
        user: {
          id: user.id,
          name: user.name ?? user.id, // 使用用户真实名称，如果没有则降级使用ID
          email: user.email ?? '',
          avatar: user.avatar // 使用真实头像
        },
        isLoading: true,
        isFailed: false
      };
      
      // 乐观更新
      queryClient.setQueryData<ChatMessage[]>([MESSAGES_QUERY_KEY], (old = []) => [...old, tempMessage]);
      
      return { tempMessage };
    },
    onError: (_error, _content, context) => {
      if (!context?.tempMessage) return;
      
      // 出错时将消息状态更新为失败，而不是移除
      queryClient.setQueryData<ChatMessage[]>([MESSAGES_QUERY_KEY], (old = []) => 
        old?.map(message => 
          message.id === context.tempMessage.id
            ? { ...message, isLoading: false, isFailed: true }
            : message
        ) || []
      );
      
      // 显示错误提示
      toast.error('发送失败，请重试');
    },
    // 我们不需要onSuccess处理器，因为消息会通过WebSocket返回
  });
  
  return { sendMessage, isSending };
}

/**
 * 上传并发送图片的Hook
 */
export function useUploadImage(user: any) {
  const queryClient = useQueryClient();
  
  const { mutate: uploadImage, isPending: isUploading } = useMutation({
    mutationFn: (file: File) => chatService.uploadChatImage(file),
    onMutate: async (_) => {
      // 取消任何传出的重新获取
      await queryClient.cancelQueries({ queryKey: [MESSAGES_QUERY_KEY] });
      
      if (!user?.id) return;
      
      // 创建临时图片消息
      const tempMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        content: '📤 Uploading Image...',
        type: 'text', // 先作为文本消息，成功后会替换为图片
        createdAt: new Date(),
        user: {
          id: user.id,
          name: user.name ?? user.id,
          email: user.email ?? '',
          avatar: user.avatar
        },
        isLoading: true,
        isFailed: false
      };
      
      // 乐观更新
      queryClient.setQueryData<ChatMessage[]>([MESSAGES_QUERY_KEY], (old = []) => [...old, tempMessage]);
      
      return { tempMessage };
    },
    onError: (_error, _file, context) => {
      if (!context?.tempMessage) return;
      
      // 更新为失败状态
      queryClient.setQueryData<ChatMessage[]>([MESSAGES_QUERY_KEY], (old = []) => 
        old?.map(message => 
          message.id === context.tempMessage.id
            ? { ...message, content: '❌ Upload failed', isLoading: false, isFailed: true }
            : message
        ) || []
      );
      
      toast.error('图片上传失败，请重试');
    },
    onSuccess: (_data, _file, context) => {
      if (!context?.tempMessage) return;
      
      // 图片上传成功后，移除临时消息，实际消息会通过WebSocket回调添加
      queryClient.setQueryData<ChatMessage[]>([MESSAGES_QUERY_KEY], (old = []) => 
        old?.filter(message => message.id !== context.tempMessage.id) || []
      );
    }
  });
  
  return { uploadImage, isUploading };
}

/**
 * 管理聊天连接的Hook
 */
export function useChatConnection(user: any) {
  const { addMessage } = useChatMessages();
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  
  // 初始连接和事件监听
  useEffect(() => {
    if (!user?.id) return;
    
    setConnectionStatus('connecting');
    
    // 建立连接
    const connectChat = async () => {
      try {
        // 连接聊天服务
        await chatService.connect({
          id: user.id,
          name: user.name ?? null,
          email: user.email ?? '',
          avatar: user.avatar
        });
        
        setConnectionStatus('connected');
      } catch (error) {
        console.error('初始连接失败:', error);
        setConnectionStatus('disconnected');
      }
    };
    
    // 确保函数被调用
    connectChat();
    
    // 订阅消息
    const unsubscribeMessage = chatService.onMessage((newMsg) => {
      addMessage(newMsg);
    });
    
    // 订阅在线用户计数
    const unsubscribeOnline = chatService.onOnlineCount((count) => {
      setOnlineUsers(count);
    });
    
    // 订阅连接状态变化
    const unsubscribeConnection = chatService.onConnectionStatusChange((connected) => {
      setConnectionStatus(connected ? 'connected' : 'disconnected');
    });
    
    // 创建重连函数
    const checkConnection = async () => {
      if (chatService.isConnected()) return;
      
      setConnectionStatus('connecting');
      
      try {
        await chatService.checkConnection();
        // 状态会通过onConnectionStatusChange更新
      } catch (error) {
        console.error('重连失败:', error);
        setConnectionStatus('disconnected');
      }
    };
    
    // 设置页面可见性变化监听
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkConnection();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      unsubscribeMessage();
      unsubscribeOnline();
      unsubscribeConnection();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      chatService.disconnect();
      setConnectionStatus('disconnected');
    };
  }, [user, addMessage]);
  
  return { 
    onlineUsers, 
    connectionStatus
  };
}

/**
 * 将消息按时间进行分组的Hook
 */
export function useMessageGroups(messages: ChatMessage[]) {
  interface TimeGroup {
    id: string;
    time: Date;
    messages: ChatMessage[];
  }
  
  return useMemo(() => {
    if (!messages.length) return [];
    
    const groups: TimeGroup[] = [];
    let currentGroup: TimeGroup | null = null;
    
    // 按时间升序排列消息
    const sortedMessages = [...messages].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    for (const message of sortedMessages) {
      const messageTime = new Date(message.createdAt);

      // 如果是第一条消息或者与上一组时间差超过5分钟，创建新组
      if (!currentGroup || 
          (messageTime.getTime() - currentGroup.time.getTime()) > 5 * 60 * 1000) {
        currentGroup = {
          id: message.id,
          time: messageTime,
          messages: []
        };
        groups.push(currentGroup);
      }

      currentGroup.messages.push(message);
    }

    return groups;
  }, [messages]);
} 