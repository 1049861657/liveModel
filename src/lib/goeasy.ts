import GoEasy from 'goeasy';

/**
 * 消息回调函数类型
 */
type MessageCallback = (message: any) => void;

/**
 * 在线人数回调函数类型
 */
type OnlineCountCallback = (count: number) => void;

/**
 * 在线用户回调函数类型
 */
type OnlineUsersCallback = (users: Array<{ id: string; data: any }>) => void;

/**
 * 连接状态回调函数类型
 */
type ConnectionStatusCallback = (status: 'connected' | 'disconnected' | 'connecting') => void;

/**
 * GoEasy服务封装类
 * 简化版实现，提供更可靠的连接和消息处理
 */
class GoEasyService {
  private static instance: GoEasyService;
  private goEasy: any;
  private connectionStatus: 'connected' | 'disconnected' | 'connecting' = 'disconnected';
  private subscriptions: Map<string, Set<MessageCallback>> = new Map();
  private onlineCallbacks: Set<OnlineCountCallback> = new Set();
  private onlineUsersCallbacks: Set<OnlineUsersCallback> = new Set();
  private connectionStatusCallbacks: Set<ConnectionStatusCallback> = new Set();
  private currentUserId: string | null = null;
  private currentUserData: any = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private maxReconnectAttempts = 5;
  private reconnectAttempts = 0;
  private reconnectInterval = 3000; // 初始重连间隔为3秒

  /**
   * 构造函数，初始化GoEasy实例
   * 私有构造函数，防止直接实例化
   */
  private constructor() {
    const appkey = process.env.NEXT_PUBLIC_GOEASY_APPKEY;
    
    if (!appkey) {
      console.error('GoEasy AppKey not found in environment variables');
      return;
    }

    // 初始化GoEasy
    this.goEasy = GoEasy.getInstance({
      host: 'hangzhou.goeasy.io', // 默认使用杭州区域的服务器
      appkey,
      modules: ['pubsub']
    });
  }

  /**
   * 获取GoEasyService单例
   * @returns GoEasyService实例
   */
  public static getInstance(): GoEasyService {
    if (!GoEasyService.instance) {
      GoEasyService.instance = new GoEasyService();
    }
    return GoEasyService.instance;
  }

  /**
   * 通知所有连接状态监听器
   * @param status 连接状态
   */
  private notifyConnectionStatus(status: 'connected' | 'disconnected' | 'connecting') {
    this.connectionStatus = status;
    this.connectionStatusCallbacks.forEach(callback => {
      try {
        callback(status);
      } catch (e) {
        console.error('执行连接状态回调时出错:', e);
      }
    });
  }

  /**
   * 开始重连逻辑
   */
  private startReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('达到最大重连次数，停止重连');
      return;
    }

    this.reconnectAttempts++;
    // 使用指数退避算法，每次重连失败后，等待时间增加
    const delay = Math.min(30000, this.reconnectInterval * Math.pow(1.5, this.reconnectAttempts - 1));
    
    console.log(`将在${delay / 1000}秒后尝试第${this.reconnectAttempts}次重连...`);
    
    this.reconnectTimer = setTimeout(() => {
      if (this.currentUserId) {
        console.log(`尝试第${this.reconnectAttempts}次重连...`);
        this.connect(this.currentUserId, this.currentUserData)
          .catch(error => {
            console.error('重连失败:', error);
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
              this.startReconnect();
            }
          });
      }
      this.reconnectTimer = null;
    }, delay);
  }

  /**
   * 连接到GoEasy服务
   * @param userId 用户ID
   * @param userData 用户数据（可选）
   * @returns Promise 连接结果
   */
  public async connect(userId: string, userData: any = {}): Promise<boolean> {
    // 如果已经连接且是同一用户，直接返回成功
    if (this.connectionStatus === 'connected' && this.currentUserId === userId) {
      return Promise.resolve(true);
    }

    // 如果正在连接中，等待连接完成
    if (this.connectionStatus === 'connecting') {
      return new Promise((resolve, reject) => {
        const checkConnectionStatus = () => {
          if (this.connectionStatus === 'connected') {
            if (this.currentUserId === userId) {
              resolve(true);
            } else {
              // 连接了，但不是当前用户，需要重新连接
              this.disconnect().then(() => {
                this.connect(userId, userData).then(resolve).catch(reject);
              });
            }
          } else if (this.connectionStatus === 'disconnected') {
            // 连接失败，尝试重新连接
            this.connect(userId, userData).then(resolve).catch(reject);
          } else {
            // 仍在连接中，继续等待
            setTimeout(checkConnectionStatus, 300);
          }
        };
        
        setTimeout(checkConnectionStatus, 300);
      });
    }

    // 如果已连接但用户不同，先断开连接
    if (this.connectionStatus === 'connected' && this.currentUserId !== userId) {
      await this.disconnect();
    }

    // 保存当前用户信息，用于重连
    this.currentUserId = userId;
    this.currentUserData = userData;

    // 通知正在连接中
    this.notifyConnectionStatus('connecting');

    // 开始连接
    return new Promise<boolean>((resolve, reject) => {
      this.goEasy.connect({
        id: userId,
        data: userData,
        onSuccess: () => {
          console.log('GoEasy连接成功');
          this.notifyConnectionStatus('connected');
          this.reconnectAttempts = 0;
          
          // 如果之前有待重连的定时器，清除它
          if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
          }
          
          resolve(true);
        },
        onFailed: (error: any) => {
          console.error('GoEasy连接失败:', error);
          this.notifyConnectionStatus('disconnected');
          reject(error);
        },
        onProgress: (attempts: number) => {
          console.log(`GoEasy正在连接... 尝试次数: ${attempts}`);
          this.notifyConnectionStatus('connecting');
        }
      });
    });
  }

  /**
   * 订阅频道
   * @param channel 频道名称
   * @param callback 消息回调函数
   * @returns Promise 返回取消订阅的函数
   */
  public subscribe(channel: string, callback: MessageCallback): Promise<() => void> {
    return new Promise<() => void>((resolve, reject) => {
      // 确保不重复订阅相同的回调
      if (!this.subscriptions.has(channel)) {
        this.subscriptions.set(channel, new Set());
      }

      const callbacks = this.subscriptions.get(channel)!;
      
      // 如果回调已存在，直接返回取消订阅函数
      if (callbacks.has(callback)) {
        return resolve(() => this.unsubscribeCallback(channel, callback));
      }

      // 添加回调到集合中
      callbacks.add(callback);

      // 如果是首次订阅此频道，设置GoEasy订阅
      if (callbacks.size === 1) {
        // 设置订阅超时
        const timeoutId = setTimeout(() => {
          reject(new Error(`订阅频道 ${channel} 超时`));
        }, 10000);

        // 订阅消息
        this.goEasy.pubsub.subscribe({
          channel,
          presence: { enable: true }, // 启用在线状态功能
          onMessage: (message: any) => {
            // 调用所有注册的回调
            const callbackSet = this.subscriptions.get(channel);
            if (callbackSet) {
              callbackSet.forEach(cb => {
                try {
                  cb(message);
                } catch (e) {
                  console.error(`执行频道 ${channel} 的消息回调时出错:`, e);
                }
              });
            }
          },
          onSuccess: () => {
            clearTimeout(timeoutId);
            console.log(`成功订阅频道: ${channel}`);
            
            // 订阅在线状态
            this.subscribePresence(channel)
              .then(() => resolve(() => this.unsubscribeCallback(channel, callback)))
              .catch(error => {
                console.error(`订阅频道 ${channel} 的在线状态失败:`, error);
                // 即使在线状态订阅失败，也算基本订阅成功
                resolve(() => this.unsubscribeCallback(channel, callback));
              });
          },
          onFailed: (error: any) => {
            clearTimeout(timeoutId);
            console.error(`订阅频道 ${channel} 失败:`, error);
            // 订阅失败，从集合中移除回调
            callbacks.delete(callback);
            if (callbacks.size === 0) {
              this.subscriptions.delete(channel);
            }
            reject(error);
          }
        });
      } else {
        // 频道已经订阅过，直接返回取消订阅函数
        resolve(() => this.unsubscribeCallback(channel, callback));
      }
    });
  }

  /**
   * 订阅频道的在线状态 - 使用GoEasy 2.7+新API
   * @param channel 频道名称
   * @returns Promise
   */
  private subscribePresence(channel: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.goEasy.pubsub.subscribePresence({
        channel,
        onPresence: (presenceEvent: any) => {
          console.log(`收到频道 ${channel} 的在线状态变化:`, presenceEvent);
          
          // 2.7+ API - 现在在线状态事件包含成员列表和在线数量
          if (presenceEvent && presenceEvent.action) {
            // 更新在线人数回调 - 使用正确的 amount 字段
            if (presenceEvent.amount !== undefined) {
              console.log(`频道 ${channel} 当前在线人数:`, presenceEvent.amount);
              this.onlineCallbacks.forEach(callback => {
                try {
                  callback(presenceEvent.amount);
                } catch (e) {
                  console.error('执行在线人数回调时出错:', e);
                }
              });
            }
            
            // 更新在线用户列表回调
            if (presenceEvent.members && Array.isArray(presenceEvent.members)) {
              this.onlineUsersCallbacks.forEach(callback => {
                try {
                  callback(presenceEvent.members);
                } catch (e) {
                  console.error('执行在线用户列表回调时出错:', e);
                }
              });
            }
          }
        },
        onSuccess: () => {
          console.log(`成功订阅频道 ${channel} 的在线状态`);
          
          // 获取当前在线状态 - 使用新的API和参数
          this.queryCurrentOnlineStatus(channel);
          resolve();
        },
        onFailed: (error: any) => {
          console.error(`订阅频道 ${channel} 的在线状态失败:`, error);
          reject(error);
        }
      });
    });
  }

  /**
   * 查询当前在线状态 - 使用GoEasy 2.7+新API
   * @param channel 频道名称
   */
  private queryCurrentOnlineStatus(channel: string): void {
    this.goEasy.pubsub.hereNow({
      channel: channel,
      includeUsers: true, // 包含用户列表
      distinct: true, // 相同userId只返回一次
      onSuccess: (response: any) => {
        console.log(`获取频道 ${channel} 的当前在线状态成功:`, response);
        
        // 处理API响应格式
        if (response && response.code === 200 && response.content) {
          // 直接处理当前API格式，API返回的格式是 {content: {channel: 'chat_room', members: Array(1), amount: 1}}
          if (response.content.channel === channel) {
            // 通知当前在线人数
            if (response.content.amount !== undefined) {
              console.log(`频道 ${channel} 当前在线人数(查询结果):`, response.content.amount);
              this.onlineCallbacks.forEach(callback => {
                try {
                  callback(response.content.amount);
                } catch (e) {
                  console.error('执行初始在线人数回调时出错:', e);
                }
              });
            }
            
            // 通知当前在线用户列表
            if (response.content.members && Array.isArray(response.content.members)) {
              this.onlineUsersCallbacks.forEach(callback => {
                try {
                  callback(response.content.members);
                } catch (e) {
                  console.error('执行初始在线用户列表回调时出错:', e);
                }
              });
            }
          }
        }
      },
      onFailed: (error: any) => {
        console.error(`获取频道 ${channel} 的当前在线状态失败:`, error);
      }
    });
  }

  /**
   * 取消单个回调的订阅
   * @param channel 频道名称
   * @param callback 要取消的回调函数
   */
  private unsubscribeCallback(channel: string, callback: MessageCallback) {
    const callbacks = this.subscriptions.get(channel);
    if (!callbacks) return;

    // 从回调集合中移除
    callbacks.delete(callback);

    // 如果没有回调了，取消整个频道的订阅
    if (callbacks.size === 0) {
      this.unsubscribeChannel(channel);
    }
  }

  /**
   * 取消整个频道的订阅
   * @param channel 频道名称
   */
  private unsubscribeChannel(channel: string) {
    this.subscriptions.delete(channel);

    // 取消消息订阅
    this.goEasy.pubsub.unsubscribe({
      channel,
      onSuccess: () => {
        console.log(`成功取消订阅频道: ${channel}`);
      },
      onFailed: (error: any) => {
        console.error(`取消订阅频道 ${channel} 失败:`, error);
      }
    });

    // 取消在线状态订阅
    this.goEasy.pubsub.unsubscribePresence({
      channel,
      onSuccess: () => {
        console.log(`成功取消订阅频道 ${channel} 的在线状态`);
      },
      onFailed: (error: any) => {
        console.error(`取消订阅频道 ${channel} 的在线状态失败:`, error);
      }
    });
  }

  /**
   * 发布消息到频道
   * @param channel 频道名
   * @param message 消息内容
   * @returns Promise 发布结果
   */
  public publish(channel: string, message: any): Promise<boolean> {
    // 检查连接状态，如果不是connected，将尝试立即重连
    if (this.goEasy.getConnectionStatus() !== 'connected') {
      // 返回一个Promise，延迟处理，先尝试重新连接
      return new Promise<boolean>((resolve, reject) => {
        if (!this.currentUserId) {
          return reject(new Error('未设置用户ID，无法重连'));
        }
        
        // 尝试重新连接
        this.connect(this.currentUserId, this.currentUserData)
          .then(connected => {
            if (!connected) {
              return reject(new Error('重连失败，无法发送消息'));
            }
            
            // 连接成功后发送消息
            this.goEasy.pubsub.publish({
              channel,
              message,
              onSuccess: () => {
                resolve(true);
              },
              onFailed: (error: any) => {
                console.error(`消息发布失败:`, error);
                reject(error);
              }
            });
          })
          .catch(error => {
            console.error('重连过程出错:', error);
            reject(error);
          });
      });
    }
    
    // 如果连接状态正常，直接发送
    return new Promise<boolean>((resolve, reject) => {
      this.goEasy.pubsub.publish({
        channel,
        message,
        onSuccess: () => {
          resolve(true);
        },
        onFailed: (error: any) => {
          console.error(`消息发布失败:`, error);
          
          // 检查是否是连接相关错误，如果是则尝试重连
          if (error && (error.code === 'NETWORK_ERROR' || error.code === 'CONNECTION_ERROR' || error.message?.includes('connection'))) {
            this.notifyConnectionStatus('disconnected');
            
            // 如果有用户ID，尝试重连
            if (this.currentUserId) {
              this.startReconnect();
            }
          }
          
          reject(error);
        }
      });
    });
  }

  /**
   * 监听在线人数变化
   * @param callback 回调函数
   * @returns 取消监听的函数
   */
  public onOnlineCountChange(callback: OnlineCountCallback): () => void {
    this.onlineCallbacks.add(callback);
    return () => {
      this.onlineCallbacks.delete(callback);
    };
  }

  /**
   * 监听在线用户列表变化
   * @param callback 回调函数
   * @returns 取消监听的函数
   */
  public onOnlineUsersChange(callback: OnlineUsersCallback): () => void {
    this.onlineUsersCallbacks.add(callback);
    return () => {
      this.onlineUsersCallbacks.delete(callback);
    };
  }

  /**
   * 监听连接状态变化
   * @param callback 回调函数
   * @returns 取消监听的函数
   */
  public onConnectionStatusChange(callback: ConnectionStatusCallback): () => void {
    this.connectionStatusCallbacks.add(callback);
    // 立即通知当前状态
    callback(this.connectionStatus);
    return () => {
      this.connectionStatusCallbacks.delete(callback);
    };
  }

  /**
   * 断开连接
   * @returns Promise
   */
  public disconnect(): Promise<void> {
    if (this.connectionStatus === 'disconnected') {
      return Promise.resolve();
    }

    // 清除重连定时器
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    return new Promise<void>((resolve) => {
      // 取消所有订阅
      for (const channel of this.subscriptions.keys()) {
        this.unsubscribeChannel(channel);
      }
      
      // 断开连接
      this.goEasy.disconnect({
        onSuccess: () => {
          console.log('GoEasy断开连接成功');
          this.notifyConnectionStatus('disconnected');
          this.currentUserId = null;
          this.currentUserData = null;
          this.subscriptions.clear();
          resolve();
        },
        onFailed: (error: any) => {
          console.error('GoEasy断开连接失败:', error);
          // 即使失败也重置状态
          this.notifyConnectionStatus('disconnected');
          this.currentUserId = null;
          this.currentUserData = null;
          this.subscriptions.clear();
          resolve();
        }
      });
    });
  }

  /**
   * 获取当前连接状态
   * @returns 连接状态
   */
  public getConnectionStatus(): 'connected' | 'disconnected' | 'connecting' {
    return this.connectionStatus;
  }

  /**
   * 获取当前用户ID
   * @returns 用户ID
   */
  public getCurrentUserId(): string | null {
    return this.currentUserId;
  }

  /**
   * 获取当前用户数据
   * @returns 用户数据
   */
  public getCurrentUserData(): any {
    return this.currentUserData;
  }

  /**
   * 手动查询指定频道的在线用户 - 新增方法
   * @param channel 频道名称
   * @returns Promise 返回在线用户信息
   */
  public getOnlineUsers(channel: string): Promise<{amount: number, members: Array<{id: string, data: any}>}> {
    return new Promise((resolve, reject) => {
      this.goEasy.pubsub.hereNow({
        channel: channel,
        includeUsers: true,
        distinct: true,
        onSuccess: (response: any) => {
          if (response && response.code === 200 && response.content) {
            // 直接使用新的API格式
            if (response.content.channel === channel) {
              resolve({
                amount: response.content.amount || 0,
                members: response.content.members || []
              });
            } else {
              resolve({amount: 0, members: []});
            }
          } else {
            reject(new Error('无效的响应格式'));
          }
        },
        onFailed: (error: any) => {
          reject(error);
        }
      });
    });
  }

  /**
   * 设置最大重连次数
   * @param maxAttempts 最大尝试次数
   */
  public setMaxReconnectAttempts(maxAttempts: number) {
    this.maxReconnectAttempts = maxAttempts;
  }

  /**
   * 设置重连间隔
   * @param interval 基础重连间隔（毫秒）
   */
  public setReconnectInterval(interval: number) {
    this.reconnectInterval = interval;
  }
}

// 导出单例实例
export default GoEasyService.getInstance(); 