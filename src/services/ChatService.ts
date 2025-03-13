import goEasy from '@/lib/goeasy';
import { toast } from 'react-hot-toast';

export interface ChatUser {
  id: string;
  name: string | null | undefined;
  email: string | null | undefined;
  avatar?: {
    url: string;
  } | null;
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
type ConnectionStatusCallback = (status: boolean) => void;

/**
 * 聊天服务
 * 负责处理聊天相关功能，包括连接、发送消息、接收消息等
 */
class ChatService {
  private static instance: ChatService;
  private messageCallbacks: Set<MessageCallback> = new Set();
  private onlineCountCallbacks: Set<OnlineCountCallback> = new Set();
  private connectionStatusCallbacks: Set<ConnectionStatusCallback> = new Set();
  private connected: boolean = false;
  private currentUser: ChatUser | null = null;
  private visibilityChangeHandler: ((event: Event) => void) | null = null;
  private goEasyUnsubscribeFunctions: Array<() => void> = [];
  private connectionCheckInterval: NodeJS.Timeout | null = null;
  private reconnecting: boolean = false;
  private subscriptionSetupPromise: Promise<boolean> | null = null;

  private constructor() {
    // 监听GoEasy连接状态变化
    const removeStatusListener = goEasy.onConnectionStatusChange(status => {
      const isConnected = status === 'connected';
      
      // 只在状态实际发生变化时才通知
      if (isConnected !== this.connected) {
        this.connected = isConnected;
        this.notifyConnectionStatusChange();
        
        // 如果连接成功，确保订阅已设置
        if (isConnected && this.currentUser) {
          this.ensureSubscriptions();
        }
      }
    });
    
    // 存储取消监听函数以便清理
    this.goEasyUnsubscribeFunctions.push(removeStatusListener);
    
    // 设置连接状态检查定时器
    this.startConnectionMonitoring();
  }

  /**
   * 获取ChatService单例
   */
  public static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }

  /**
   * 开始连接状态监控
   */
  private startConnectionMonitoring() {
    // 清除现有定时器
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
      this.connectionCheckInterval = null;
    }
  }

  /**
   * 连接到聊天服务
   * @param user 用户信息
   */
  public async connect(user: ChatUser): Promise<void> {
    // 保存当前用户信息
    this.currentUser = user;
    
    // 如果已连接且GoEasy也已连接，直接返回
    if (this.connected && goEasy.getConnectionStatus() === 'connected') {
      this.ensureSubscriptions();
      return;
    }

    try {
      this.reconnecting = true;
      
      // 断开现有连接以确保状态清晰
      if (goEasy.getConnectionStatus() === 'connected') {
        await goEasy.disconnect();
        
        // 简短延时确保断开完成
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // 连接到GoEasy
      await goEasy.connect(user.id, {
        name: user.name ?? null,
        email: user.email ?? ''
      });
      
      // 设置订阅
      await this.setupSubscriptions();
      
      // 设置页面可见性监听器
      this.setupVisibilityListener();
      
      this.reconnecting = false;
      
      // 主动通知连接成功
      if (goEasy.getConnectionStatus() === 'connected' && !this.connected) {
        this.connected = true;
        this.notifyConnectionStatusChange();
      }
    } catch (error) {
      this.reconnecting = false;
      console.error('[ChatService] 连接失败:', error);
      toast.error('聊天服务连接失败');
    }
  }

  /**
   * 确保订阅已设置
   */
  private ensureSubscriptions() {
    if (!this.subscriptionSetupPromise) {
      this.subscriptionSetupPromise = this.setupSubscriptions().finally(() => {
        this.subscriptionSetupPromise = null;
      });
    }
    return this.subscriptionSetupPromise;
  }

  /**
   * 设置各种订阅
   */
  private async setupSubscriptions(): Promise<boolean> {
    // 如果未连接，先尝试重连
    if (goEasy.getConnectionStatus() !== 'connected') {
      // 等待最多5秒，让连接完成
      for (let i = 0; i < 10; i++) {
        if (goEasy.getConnectionStatus() === 'connected') {
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // 如果仍未连接，无法设置订阅
      if (goEasy.getConnectionStatus() !== 'connected') {
        return false;
      }
    }
    
    try {
      // 清理之前的订阅
      this.cleanupSubscriptions();
      
      // 订阅聊天室频道
      const unsubscribeMessage = await goEasy.subscribe('chat_room', (message: any) => {
        try {
          // 解析消息内容
          let newMsg;
          if (typeof message.content === 'string') {
            newMsg = JSON.parse(message.content);
          } else if (typeof message.content === 'object') {
            newMsg = message.content;
          } else {
            throw new Error('未知的消息格式');
          }
          
          // 如果收到的消息是当前用户发送的，可以跳过（因为在发送时已处理）
          if (this.currentUser && newMsg.user && newMsg.user.id === this.currentUser.id) {
            return;
          }
          
          // 通知UI更新
          this.notifyMessageCallbacks(newMsg);
        } catch (error) {
          console.error('[ChatService] 解析或处理消息失败:', error);
        }
      });
      this.goEasyUnsubscribeFunctions.push(unsubscribeMessage);
      
      // 监听在线人数变化
      const unsubscribeOnlineCount = goEasy.onOnlineCountChange((count: number) => {
        this.notifyOnlineCountCallbacks(count);
      });
      this.goEasyUnsubscribeFunctions.push(unsubscribeOnlineCount);
      
      return true;
    } catch (error) {
      console.error('[ChatService] 设置订阅失败:', error);
      return false;
    }
  }
  
  /**
   * 清理现有订阅
   */
  private cleanupSubscriptions() {
    // 执行所有取消订阅函数
    this.goEasyUnsubscribeFunctions.forEach(unsubscribe => {
      try {
        unsubscribe();
      } catch (e) {
        console.error('[ChatService] 执行取消订阅时出错:', e);
      }
    });
    
    // 清空订阅函数列表
    this.goEasyUnsubscribeFunctions = [];
  }

  /**
   * 设置页面可见性变化监听
   */
  private setupVisibilityListener(): void {
    // 移除旧的监听器（如果有）
    if (this.visibilityChangeHandler) {
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
    }
    
    // 创建并设置新的监听器 - 简化版本，仅用于更新状态
    this.visibilityChangeHandler = () => {
      // 当页面变为可见时，仅检查连接状态不一致的情况
      if (document.visibilityState === 'visible') {
        if (!this.currentUser) return;
        
        // 检查连接状态不一致的情况
        const goEasyConnected = goEasy.getConnectionStatus() === 'connected';
        if (this.connected !== goEasyConnected) {
          console.log('[ChatService] 检测到连接状态不一致');
          this.connected = goEasyConnected;
          this.notifyConnectionStatusChange();
        }
      }
    };

    // 添加监听器
    document.addEventListener('visibilitychange', this.visibilityChangeHandler);
  }

  /**
   * 发送消息
   * @param content 消息内容
   * @returns 成功发送的消息
   */
  public async sendMessage(content: string): Promise<ChatMessage | null> {
    try {
      // 通过API保存消息
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, type: 'text' })
      });

      if (!response.ok) throw new Error('发送失败');
      
      const savedMessage = await response.json();
      
      // 先触发本地UI更新，确保发送者立即看到自己的消息
      this.notifyMessageCallbacks(savedMessage);
      
      try {
        // 确保连接状态正常
        const isConnected = await this.ensureConnected();
        
        // 尝试通过GoEasy发布消息
        if (isConnected && goEasy.getConnectionStatus() === 'connected') {
          // 准备发布的消息对象 - 确保格式正确
          const messageToPublish = JSON.stringify({
            ...savedMessage,
            // 添加额外的元数据，帮助接收方判断
            _publishedAt: new Date().toISOString(),
            _publisher: this.currentUser?.id
          });
          
          try {
            // 发布消息到频道
            await goEasy.publish('chat_room', messageToPublish);
          } catch (pubError) {
            console.error('[ChatService] GoEasy发布消息失败:', pubError);
          }
        }
      } catch (wsError) {
        console.error('[ChatService] 处理WebSocket发送时出错:', wsError);
      }
      
      return savedMessage;
    } catch (error) {
      console.error('[ChatService] 发送消息失败:', error);
      toast.error('发送消息失败，请稍后再试');
      throw error;
    }
  }
  
  /**
   * 确保已连接
   */
  private async ensureConnected(): Promise<boolean> {
    if (this.connected && goEasy.getConnectionStatus() === 'connected') {
      return true;
    }
    
    if (!this.currentUser) {
      return false;
    }
    
    // 如果正在重连，等待最多5秒
    if (this.reconnecting) {
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        if (this.connected && goEasy.getConnectionStatus() === 'connected') {
          return true;
        }
      }
      return false;
    }
    
    // 尝试重新连接
    try {
      this.reconnecting = true;
      
      // 等待一小段时间以确保之前的连接状态已清理
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // 确保连接
      const success = await this.checkConnection();
      
      this.reconnecting = false;
      return success;
    } catch (error) {
      console.error('[ChatService] 重连失败:', error);
      this.reconnecting = false;
      return false;
    }
  }

  /**
   * 获取历史消息
   * @returns 消息列表
   */
  public async fetchMessages(): Promise<ChatMessage[]> {
    try {
      const response = await fetch('/api/chat');
      if (!response.ok) throw new Error('获取消息失败');
      return response.json();
    } catch (error) {
      console.error('获取消息失败:', error);
      toast.error('获取消息失败，请稍后再试');
      return [];
    }
  }

  /**
   * 通知所有消息回调
   * @param message 消息内容
   */
  private notifyMessageCallbacks(message: ChatMessage): void {
    this.messageCallbacks.forEach(callback => {
      try {
        callback(message);
      } catch (e) {
        console.error('执行消息回调时出错:', e);
      }
    });
  }

  /**
   * 通知所有在线人数回调
   * @param count 在线人数
   */
  private notifyOnlineCountCallbacks(count: number): void {
    this.onlineCountCallbacks.forEach(callback => {
      try {
        callback(count);
      } catch (e) {
        console.error('执行在线人数回调时出错:', e);
      }
    });
  }

  /**
   * 通知所有连接状态回调
   */
  private notifyConnectionStatusChange(): void {
    this.connectionStatusCallbacks.forEach(callback => {
      try {
        callback(this.connected);
      } catch (e) {
        console.error('执行连接状态回调时出错:', e);
      }
    });
  }

  /**
   * 注册消息接收回调
   * @param callback 回调函数
   * @returns 取消注册的函数
   */
  public onMessage(callback: MessageCallback): () => void {
    this.messageCallbacks.add(callback);
    return () => this.messageCallbacks.delete(callback);
  }

  /**
   * 注册在线人数变化回调
   * @param callback 回调函数
   * @returns 取消注册的函数
   */
  public onOnlineCount(callback: OnlineCountCallback): () => void {
    this.onlineCountCallbacks.add(callback);
    return () => this.onlineCountCallbacks.delete(callback);
  }

  /**
   * 注册连接状态变化回调
   * @param callback 回调函数
   * @returns 取消注册的函数
   */
  public onConnectionStatusChange(callback: ConnectionStatusCallback): () => void {
    this.connectionStatusCallbacks.add(callback);
    // 立即通知当前状态
    callback(this.connected);
    return () => this.connectionStatusCallbacks.delete(callback);
  }

  /**
   * 断开连接
   */
  public disconnect(): void {
    // 移除页面可见性监听器
    if (this.visibilityChangeHandler) {
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
      this.visibilityChangeHandler = null;
    }
    
    // 清理所有订阅
    this.cleanupSubscriptions();
    
    // 清理定时器
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
      this.connectionCheckInterval = null;
    }
    
    // 清理回调
    this.messageCallbacks.clear();
    this.onlineCountCallbacks.clear();
    this.connectionStatusCallbacks.clear();
    
    this.connected = false;
    this.currentUser = null;
    this.subscriptionSetupPromise = null;
    
    // 断开GoEasy连接
    try {
      if (goEasy.getConnectionStatus() === 'connected') {
        goEasy.disconnect();
      }
    } catch (error) {
      console.error('[ChatService] 断开连接时出错:', error);
    }
  }

  /**
   * 完全清理服务
   */
  public cleanup(): void {
    this.disconnect();
  }

  /**
   * 检查连接状态，如果断开则尝试重连
   * @returns 连接是否成功
   */
  public async checkConnection(): Promise<boolean> {
    if (this.connected && goEasy.getConnectionStatus() === 'connected') {
      return true;
    }
    
    if (!this.currentUser) {
      return false;
    }
    
    if (this.reconnecting) {
      return false;
    }
    
    try {
      this.reconnecting = true;
      
      // 先清理现有连接
      try {
        this.cleanupSubscriptions();
        if (goEasy.getConnectionStatus() === 'connected') {
          await goEasy.disconnect();
        }
      } catch (e) {
        console.error('[ChatService] 清理现有连接时出错:', e);
      }
      
      // 等待一小段时间
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 重新连接
      await goEasy.connect(this.currentUser.id, {
        name: this.currentUser.name ?? null,
        email: this.currentUser.email ?? ''
      });
      
      // 设置订阅
      await this.setupSubscriptions();
      
      this.reconnecting = false;
      return this.connected && goEasy.getConnectionStatus() === 'connected';
    } catch (error) {
      this.reconnecting = false;
      return false;
    }
  }

  /**
   * 检查当前连接状态
   * @returns 是否已连接
   */
  public isConnected(): boolean {
    return this.connected && goEasy.getConnectionStatus() === 'connected';
  }
}

export default ChatService.getInstance(); 