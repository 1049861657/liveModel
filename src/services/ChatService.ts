import goEasy from '@/lib/goeasy';
import { toast } from 'react-hot-toast';

export interface ChatUser {
  id: string;
  name: string | null | undefined;
  email: string | null | undefined;
}

export interface ChatMessage {
  id: string;
  content: string;
  type: 'text' | 'image';
  createdAt: Date;
  user: ChatUser;
  isLoading?: boolean;
}

type MessageCallback = (message: ChatMessage) => void;
type OnlineCountCallback = (count: number) => void;

class ChatService {
  private static instance: ChatService;
  private messageCallbacks: Set<MessageCallback> = new Set();
  private onlineCountCallbacks: Set<OnlineCountCallback> = new Set();
  private connected: boolean = false;
  private currentUser: ChatUser | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private visibilityChangeHandler: ((event: Event) => void) | null = null;

  private constructor() {}

  public static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }

  public async connect(user: ChatUser, retryCount = 0) {
    console.log('[ChatService] Connecting...', {
      currentUser: this.currentUser,
      connected: this.connected,
      goEasyConnected: goEasy.isConnected()
    });
    
    this.currentUser = user;
    
    if (this.connected) {
      if (goEasy.isConnected()) {
        console.log('[ChatService] Already connected, skipping');
        return;
      } else {
        console.log('[ChatService] State mismatch, resetting connection');
        this.connected = false;
      }
    }

    try {
      await goEasy.connect(user.id, {
        name: user.name ?? null,
        email: user.email ?? ''
      });

      console.log('[ChatService] Connection successful, setting up subscriptions');
      this.setupSubscriptions();
      this.connected = true;
      this.setupVisibilityListener();
    } catch (error) {
      console.error('[ChatService] Connection failed:', error);
      this.handleReconnect(retryCount);
    }
  }

  private handleReconnect(retryCount: number) {
    console.log('[ChatService] Handling reconnect', { retryCount });
    
    if (retryCount < 3 && this.currentUser) {
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
      }
      this.reconnectTimer = setTimeout(() => {
        console.log('[ChatService] Attempting retry', { retryCount: retryCount + 1 });
        this.connect(this.currentUser!, retryCount + 1);
      }, 2000 * (retryCount + 1));
    } else {
      console.log('[ChatService] Max retries reached or no user');
      toast.error('聊天服务连接失败，请刷新重试');
    }
  }

  private setupVisibilityListener() {
    const handleVisibilityChange = async () => {
      console.log('[ChatService] Visibility changed', {
        state: document.visibilityState,
        connected: this.connected,
        goEasyConnected: goEasy.isConnected()
      });

      if (document.visibilityState === 'visible' && this.currentUser) {
        this.connected = false;
        
        try {
          await goEasy.disconnect();
          
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          await this.connect(this.currentUser);
        } catch (error) {
          console.error('[ChatService] Reconnection failed:', error);
          this.handleReconnect(0);
        }
      }
    };

    this.visibilityChangeHandler = handleVisibilityChange;
    document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
    document.addEventListener('visibilitychange', this.visibilityChangeHandler);
  }

  private setupSubscriptions() {
    goEasy.subscribe('chat_room', (message: any) => {
      try {
        const newMsg = JSON.parse(message.content);
        this.messageCallbacks.forEach(callback => callback(newMsg));
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    });

    goEasy.onOnlineCountChange((count: number) => {
      this.onlineCountCallbacks.forEach(callback => callback(count));
    });
  }

  public async sendMessage(content: string): Promise<ChatMessage | null> {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, type: 'text' })
      });

      if (!response.ok) throw new Error('发送失败');
      
      const savedMessage = await response.json();
      await goEasy.publish('chat_room', JSON.stringify(savedMessage));
      return savedMessage;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  public async fetchMessages(): Promise<ChatMessage[]> {
    const response = await fetch('/api/chat');
    if (!response.ok) throw new Error('获取消息失败');
    return response.json();
  }

  public onMessage(callback: MessageCallback) {
    this.messageCallbacks.add(callback);
    return () => this.messageCallbacks.delete(callback);
  }

  public onOnlineCount(callback: OnlineCountCallback) {
    this.onlineCountCallbacks.add(callback);
    return () => this.onlineCountCallbacks.delete(callback);
  }

  public disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.messageCallbacks.clear();
    this.onlineCountCallbacks.clear();
    this.connected = false;
    
    if (this.visibilityChangeHandler) {
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
      this.visibilityChangeHandler = null;
    }
    
    if (goEasy.isConnected()) {
      goEasy.disconnect();
    }
  }

  public cleanup() {
    this.disconnect();
    this.currentUser = null;
  }
}

export default ChatService.getInstance(); 