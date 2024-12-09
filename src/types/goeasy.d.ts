declare module 'goeasy' {
  interface GoEasyOptions {
    host: string;
    appkey: string;
    modules?: string[];
  }

  interface GoEasyPubSub {
    subscribe(options: {
      channel: string;
      onMessage: (message: any) => void;
      onSuccess?: () => void;
      onFailed?: (error: any) => void;
    }): void;
    publish(options: {
      channel: string;
      message: any;
      onSuccess?: () => void;
      onFailed?: (error: any) => void;
    }): void;
    unsubscribe(options: {
      channel: string;
      onSuccess?: () => void;
      onFailed?: (error: any) => void;
    }): void;
  }

  export default class GoEasy {
    static getInstance(options: GoEasyOptions): GoEasy;
    on(event: 'connected' | 'disconnected' | 'error', callback: (error?: any) => void): void;
    pubsub: GoEasyPubSub;
  }
} 