import { WebSocket, WebSocketServer } from 'ws'
import { createServer } from 'http'
import { prisma } from '@/lib/db'

interface WebSocketClient extends WebSocket {
  userId?: string;
  isAlive: boolean;
  isAuthenticated?: boolean;
}

interface AuthMessage {
  type: 'auth';
  user: {
    id: string;
    email: string;
    name?: string | null;
  };
}

// 广播在线用户数
function broadcastOnlineUsers() {
  const onlineCount = clients.size
  const message = JSON.stringify({
    type: 'online_users',
    count: onlineCount
  })
  
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN && client.isAuthenticated) {
      client.send(message)
    }
  })
  console.log(`广播在线用户数: ${onlineCount}`)
}

// 心跳检测
const heartbeat = () => {
  clients.forEach((client: WebSocketClient) => {
    if (!client.isAlive) {
      clients.delete(client.userId!)
      client.terminate()
      broadcastOnlineUsers() // 当客户端断开时更新在线用户数
      return
    }
    client.isAlive = false
    client.ping()
  })
}

// 定期清理断开的连接
setInterval(heartbeat, 30000)

// 验证用户身份
async function authenticateUser(userData: AuthMessage['user']): Promise<boolean> {
  try {
    // 验证用户是否存在
    const user = await prisma.user.findUnique({
      where: {
        id: userData.id,
        email: userData.email
      }
    })

    return !!user
  } catch (error) {
    console.error('验证用户身份失败:', error)
    return false
  }
}

// 存储所有连接的客户端
const clients = new Map<string, WebSocketClient>()

// 开发环境继续使用普通的 ws
const server = createServer()
const wss = new WebSocketServer({ server })

wss.on('connection', async (ws: WebSocketClient) => {
  console.log('新的WebSocket连接请求')
  ws.isAuthenticated = false
  ws.isAlive = true

  // 设置认证超时
  const authTimeout = setTimeout(() => {
    if (!ws.isAuthenticated) {
      console.log('认证超时，关闭连接')
      ws.close(1000, 'Authentication timeout')
    }
  }, 5000) // 5秒超时

  // 监听消息
  ws.on('message', async (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString())
      console.log('收到消息:', message.type)

      // 处理认证消息
      if (message.type === 'auth') {
        console.log('处理认证消息:', message.user)
        const isValid = await authenticateUser(message.user)
        
        if (isValid) {
          ws.isAuthenticated = true
          ws.userId = message.user.id
          clients.set(message.user.id, ws)
          clearTimeout(authTimeout)
          console.log(`用户 ${message.user.id} 认证成功`)
          
          // 发送认证成功响应，包含当前在线用户数
          ws.send(JSON.stringify({
            type: 'auth_result',
            success: true,
            onlineUsers: clients.size
          }))

          // 广播更新后的在线用户数
          broadcastOnlineUsers()
          return
        } else {
          console.log('认证失败，关闭连接')
          ws.send(JSON.stringify({
            type: 'auth_result',
            success: false,
            error: 'Invalid user'
          }))
          ws.close(1000, 'Authentication failed')
          return
        }
      }

      // 如果未认证，拒绝其他消息
      if (!ws.isAuthenticated) {
        console.log('未认证的消息，忽略')
        return
      }

      // 处理聊天消息
      if (message.type === 'text') {
        const savedMessage = await prisma.chatMessage.create({
          data: {
            content: message.content,
            type: 'text',
            userId: ws.userId!
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        })

        // 广播消息给所有在线客户端
        const broadcastMessage = JSON.stringify(savedMessage)
        clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN && client.isAuthenticated) {
            client.send(broadcastMessage)
          }
        })
      }
    } catch (error) {
      console.error('处理消息失败:', error)
    }
  })

  // 心跳响应
  ws.on('pong', () => {
    ws.isAlive = true
  })

  // 处理连接关闭
  ws.on('close', () => {
    if (ws.userId) {
      console.log(`用户 ${ws.userId} 断开连接`)
      clients.delete(ws.userId)
      // 广播更新后的在线用户数
      broadcastOnlineUsers()
    }
    clearTimeout(authTimeout)
  })
})

// 启动服务器
const PORT = process.env.PORT || 3001  // Render 会提供 PORT 环境变量
server.listen(PORT, () => {
  console.log(`WebSocket 服务器运行在端口 ${PORT}`)
})

export default server 