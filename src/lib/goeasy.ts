import GoEasy from 'goeasy';

interface GoEasyMessage {
  content: string;
  timestamp: number;
}

type OnlineCountCallback = (count: number) => void;
type OnlineUsersCallback = (users: Array<{ id: string; data: any }>) => void;

class GoEasyService {
  private static instance: GoEasyService;
  private goEasy: any;
  private connected: boolean = false;
  private connecting: boolean = false;
  private subscriptions: Map<string, Function[]> = new Map();
  private onlineCallbacks: Set<OnlineCountCallback> = new Set();
  private onlineUsersCallbacks: Set<OnlineUsersCallback> = new Set();
  private currentUserId: string | null = null;

  private constructor() {
    if (!process.env.NEXT_PUBLIC_GOEASY_APPKEY) {
      console.error('GoEasy AppKey not found in environment variables');
      return;
    }

    // 初始化 GoEasy
    this.goEasy = GoEasy.getInstance({
      host: 'hangzhou.goeasy.io',
      appkey: process.env.NEXT_PUBLIC_GOEASY_APPKEY,
      modules: ['pubsub']
    });
  }

  public async connect(userId: string, userData: any) {
    // 如果已经连接且是同一用户，直接返回
    if (this.connected && this.currentUserId === userId) {
      return Promise.resolve(true);
    }

    // 如果正在连接，等待连接完成
    if (this.connecting) {
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (!this.connecting) {
            clearInterval(checkInterval);
            // 检查连接结果
            if (this.connected && this.currentUserId === userId) {
              resolve(true);
            } else {
              // 如果连接失败，重新尝试连接
              this.connect(userId, userData).then(resolve);
            }
          }
        }, 100);
      });
    }

    // 如果已连接但是不同用户，先断开连接
    if (this.connected) {
      await this.disconnect();
    }

    this.connecting = true;

    return new Promise((resolve, reject) => {
      this.goEasy.connect({
        id: userId,
        data: userData,
        onSuccess: () => {
          console.log('GoEasy connected successfully');
          this.connected = true;
          this.connecting = false;
          this.currentUserId = userId;
          resolve(true);
        },
        onFailed: (error: any) => {
          console.error('GoEasy connection failed:', error);
          this.connected = false;
          this.connecting = false;
          this.currentUserId = null;
          reject(error);
        },
        onProgress: (attempts: number) => {
          // 如果重试次数过多，终止连接
          if (attempts > 3) {
            this.connecting = false;
            this.connected = false;
            this.currentUserId = null;
            reject(new Error('Connection attempts exceeded'));
          }
        }
      });
    });
  }

  public static getInstance(): GoEasyService {
    if (!GoEasyService.instance) {
      GoEasyService.instance = new GoEasyService();
    }
    return GoEasyService.instance;
  }

  public subscribe(channel: string, callback: Function) {
    // 修改连接检查和订阅逻辑
    return new Promise<() => void>((resolve, reject) => {
      const setupSubscription = () => {
        if (!this.subscriptions.has(channel)) {
          this.subscriptions.set(channel, []);
          
          // 同时进行消息和在线状态订阅
          Promise.all([
            // 消息订阅
            new Promise((resolveMsg, rejectMsg) => {
              this.goEasy.pubsub.subscribe({
                channel,
                presence: { enable: true },
                onMessage: (message: GoEasyMessage) => {
                  console.log('GoEasy received message:', message);
                  const callbacks = this.subscriptions.get(channel) || [];
                  callbacks.forEach(cb => cb(message));
                },
                onSuccess: resolveMsg,
                onFailed: rejectMsg
              });
            }),
            // Presence 订阅
            new Promise((resolvePresence, rejectPresence) => {
              this.goEasy.pubsub.subscribePresence({
                channel,
                onPresence: (presenceEvent: any) => {
                  console.log('Presence event:', presenceEvent);
                  this.onlineCallbacks.forEach(cb => cb(presenceEvent.amount));
                  if (presenceEvent.members) {
                    this.onlineUsersCallbacks.forEach(cb => cb(presenceEvent.members));
                  }
                },
                onSuccess: resolvePresence,
                onFailed: rejectPresence
              });
            })
          ]).then(() => {
            console.log(`Successfully subscribed to channel ${channel} with presence`);
            const callbacks = this.subscriptions.get(channel) || [];
            callbacks.push(callback);
            this.subscriptions.set(channel, callbacks);
            
            // 立即请求当前在线状态
            this.goEasy.pubsub.hereNow({
              channel,
              onSuccess: (presenceResponse: any) => {
                if (presenceResponse) {
                  const { amount, members } = presenceResponse;
                  if (typeof amount === 'number') {
                    this.onlineCallbacks.forEach(cb => cb(amount));
                  }
                  if (members) {
                    this.onlineUsersCallbacks.forEach(cb => cb(members));
                  }
                }
              },
              onFailed: (error: any) => {
                console.error('Failed to get initial presence:', error);
                // 失败时不影响后续订阅
              }
            });

            resolve(() => this.unsubscribe(channel, callback));
          }).catch(error => {
            console.error(`Failed to setup subscriptions for channel ${channel}:`, error);
            reject(error);
          });
        } else {
          const callbacks = this.subscriptions.get(channel) || [];
          callbacks.push(callback);
          this.subscriptions.set(channel, callbacks);
          resolve(() => this.unsubscribe(channel, callback));
        }
      };

      // 如果未连接，等待连接完成
      if (!this.connected) {
        console.log('Waiting for connection before subscribing...');
        let attempts = 0;
        const maxAttempts = 10;
        const retryInterval = setInterval(() => {
          if (this.connected) {
            clearInterval(retryInterval);
            setupSubscription();
          } else if (++attempts >= maxAttempts) {
            clearInterval(retryInterval);
            reject(new Error('Connection timeout while attempting to subscribe'));
          }
        }, 1000);
      } else {
        setupSubscription();
      }
    });
  }

  // 添加新的 unsubscribe 辅助方法
  private unsubscribe(channel: string, callback: Function) {
    const callbacks = this.subscriptions.get(channel) || [];
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
      this.subscriptions.set(channel, callbacks);

      if (callbacks.length === 0) {
        Promise.all([
          new Promise((resolve) => {
            this.goEasy.pubsub.unsubscribe({
              channel,
              onSuccess: resolve,
              onFailed: resolve // 即使失败也继续
            });
          }),
          new Promise((resolve) => {
            this.goEasy.pubsub.unsubscribePresence({
              channel,
              onSuccess: resolve,
              onFailed: resolve
            });
          })
        ]).then(() => {
          console.log(`Fully unsubscribed from channel: ${channel}`);
          this.subscriptions.delete(channel);
        });
      }
    }
  }

  public async publish(channel: string, message: any): Promise<boolean> {
    if (!this.connected) {
      console.log('Waiting for connection...');
      return new Promise((resolve) => {
        setTimeout(() => this.publish(channel, message).then(resolve), 1000);
      });
    }

    return new Promise((resolve, reject) => {
      this.goEasy.pubsub.publish({
        channel,
        message,
        onSuccess: () => {
          resolve(true);
        },
        onFailed: (error: any) => {
          console.error(`Publish to channel ${channel} failed:`, error);
          reject(error);
        }
      });
    });
  }

  public onOnlineCountChange(callback: OnlineCountCallback) {
    this.onlineCallbacks.add(callback);
    return () => {
      this.onlineCallbacks.delete(callback);
    };
  }

  public onOnlineUsersChange(callback: OnlineUsersCallback) {
    this.onlineUsersCallbacks.add(callback);
    return () => {
      this.onlineUsersCallbacks.delete(callback);
    };
  }

  public async disconnect() {
    if (!this.connected) return;

    return new Promise<void>((resolve) => {
      // 清理所有订阅
      this.subscriptions.forEach((_, channel) => {
        this.goEasy.pubsub.unsubscribe({
          channel,
          onSuccess: () => {
            console.log(`Unsubscribed from channel: ${channel}`);
          },
          onFailed: (error: any) => {
            console.error(`Unsubscribe from channel ${channel} failed:`, error);
          }
        });

        this.goEasy.pubsub.unsubscribePresence({
          channel,
          onSuccess: () => {
            console.log(`Unsubscribed from presence for channel: ${channel}`);
          },
          onFailed: (error: any) => {
            console.error(`Unsubscribe from presence failed:`, error);
          }
        });
      });

      // 断开连接
      this.goEasy.disconnect({
        onSuccess: () => {
          console.log('GoEasy disconnected successfully');
          this.connected = false;
          this.connecting = false;
          this.currentUserId = null;
          this.subscriptions.clear();
          this.onlineCallbacks.clear();
          this.onlineUsersCallbacks.clear();
          resolve();
        },
        onFailed: (error: any) => {
          console.error('GoEasy disconnect failed:', error);
          // 即使失败也重置状态
          this.connected = false;
          this.connecting = false;
          this.currentUserId = null;
          this.subscriptions.clear();
          this.onlineCallbacks.clear();
          this.onlineUsersCallbacks.clear();
          resolve();
        }
      });
    });
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public getCurrentUserId(): string | null {
    return this.currentUserId;
  }
}

export default GoEasyService.getInstance(); 