declare module 'goeasy' {
  // GoEasy初始化选项
  interface GoEasyOptions {
    host: string;
    appkey: string;
    modules?: string[];
  }

  // 连接选项
  interface ConnectOptions {
    id: string;
    data?: any;
    onSuccess?: () => void;
    onFailed?: (error: any) => void;
    onProgress?: (attempts: number) => void;
  }

  // 断开连接选项
  interface DisconnectOptions {
    onSuccess?: () => void;
    onFailed?: (error: any) => void;
  }

  // 订阅选项
  interface SubscribeOptions {
    channel: string;
    presence?: { enable: boolean };
    onMessage: (message: any) => void;
    onSuccess?: () => void;
    onFailed?: (error: any) => void;
  }

  // 在线状态订阅选项
  interface SubscribePresenceOptions {
    channel: string;
    onPresence: (presenceEvent: PresenceEvent) => void;
    onSuccess?: () => void;
    onFailed?: (error: any) => void;
  }

  // 在线状态信息
  interface PresenceEvent {
    action?: 'join' | 'leave' | 'state';
    time?: number;
    userId?: string;
    data?: any;
    amount: number;
    members?: Array<{ id: string; data: any }>;
  }

  // 查询当前在线状态选项
  interface HereNowOptions {
    channel: string;
    includeUsers?: boolean;
    distinct?: boolean;
    onSuccess: (response: any) => void;
    onFailed?: (error: any) => void;
  }

  // 取消订阅选项
  interface UnsubscribeOptions {
    channel: string;
    onSuccess?: () => void;
    onFailed?: (error: any) => void;
  }

  // 发布消息选项
  interface PublishOptions {
    channel: string;
    message: any;
    onSuccess?: () => void;
    onFailed?: (error: any) => void;
  }

  // GoEasy的PubSub模块
  interface GoEasyPubSub {
    subscribe(options: SubscribeOptions): void;
    publish(options: PublishOptions): void;
    unsubscribe(options: UnsubscribeOptions): void;
    subscribePresence(options: SubscribePresenceOptions): void;
    unsubscribePresence(options: UnsubscribeOptions): void;
    hereNow(options: HereNowOptions): void;
  }

  // GoEasy事件类型
  type GoEasyEvent = 'connected' | 'disconnected' | 'connecting' | 'error';

  // GoEasy类
  export default class GoEasy {
    // 获取GoEasy实例
    static getInstance(options: GoEasyOptions): GoEasy;
    
    // 连接到GoEasy服务
    connect(options: ConnectOptions): void;
    
    // 断开与GoEasy服务的连接
    disconnect(options?: DisconnectOptions): void;
    
    // PubSub模块
    pubsub: GoEasyPubSub;

    getConnectionStatus(): GoEasyEvent;
  }
} 