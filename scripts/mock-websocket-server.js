/**
 * 模拟直播间WebSocket服务器
 * 用于测试直播间回复机器人页面
 * 
 * 使用方法：
 * node scripts/mock-websocket-server.js
 * 
 * 默认监听端口：8888
 * 可以通过环境变量修改：PORT=8888 node scripts/mock-websocket-server.js
 */

const WebSocket = require('ws')

// 配置
const PORT = process.env.PORT || 8888
const INTERVAL = parseInt(process.env.INTERVAL) || 5000 // 消息发送间隔（毫秒），默认5秒

// 模拟用户列表
const mockUsers = [
  { nickname: '小明', displayId: 'xiaoming123' },
  { nickname: '小红', displayId: 'xiaohong456' },
  { nickname: '小李', displayId: 'xiaoli789' },
  { nickname: '小王', displayId: 'xiaowang012' },
  { nickname: '小张', displayId: 'xiaozhang345' },
  { nickname: '小刘', displayId: 'xiaoliu678' },
  { nickname: '小陈', displayId: 'xiaochen901' },
  { nickname: '小赵', displayId: 'xiaozhao234' },
]

// 模拟弹幕内容
const mockDanmuMessages = [
  '大家好！',
  '主播今天播什么？',
  '这个游戏好玩吗？',
  '666666',
  '太厉害了！',
  '学到了',
  '支持主播',
  '加油！',
  '这个怎么玩？',
  '主播能教教我吗？',
  '太棒了！',
  '哈哈哈',
  '有意思',
  '继续继续',
  '期待下一期',
  '主播辛苦了',
  '感谢分享',
  '这个不错',
  '学到了新知识',
  '支持一下',
]

// 模拟礼物列表
const mockGifts = [
  { name: '鲜花', id: 1 },
  { name: '掌声', id: 2 },
  { name: '爱心', id: 3 },
  { name: '火箭', id: 4 },
  { name: '飞机', id: 5 },
  { name: '跑车', id: 6 },
]

// 生成随机用户
function getRandomUser() {
  return mockUsers[Math.floor(Math.random() * mockUsers.length)]
}

// 生成随机弹幕
function getRandomDanmu() {
  return mockDanmuMessages[Math.floor(Math.random() * mockDanmuMessages.length)]
}

// 生成随机礼物
function getRandomGift() {
  return mockGifts[Math.floor(Math.random() * mockGifts.length)]
}

// 生成消息ID
let messageIdCounter = 1
function generateMessageId() {
  return messageIdCounter++
}

// 创建弹幕消息
function createDanmuMessage() {
  const user = getRandomUser()
  const content = getRandomDanmu()
  
  const data = {
    CurrentCount: Math.floor(Math.random() * 1000) + 100,
    EnterTipType: 0,
    MsgId: generateMessageId(),
    User: {
      Id: Math.floor(Math.random() * 1000000),
      ShortId: Math.floor(Math.random() * 100000),
      DisplayId: user.displayId,
      Nickname: user.nickname,
      Level: Math.floor(Math.random() * 50) + 1,
      PayLevel: Math.floor(Math.random() * 10),
      Gender: Math.floor(Math.random() * 3),
      HeadImgUrl: `https://example.com/avatar/${user.displayId}.jpg`,
    },
    Content: content,
    RoomId: '123456789',
    WebRoomId: '987654321',
    Appid: 'douyin',
  }
  
  return {
    Type: 1, // 弹幕消息
    ProcessName: 'mock-server',
    Data: JSON.stringify(data),
  }
}

// 创建用户进入消息
function createUserEnterMessage() {
  const user = getRandomUser()
  
  const data = {
    CurrentCount: Math.floor(Math.random() * 1000) + 100,
    EnterTipType: 0, // 0表示进入
    MsgId: generateMessageId(),
    User: {
      Id: Math.floor(Math.random() * 1000000),
      ShortId: Math.floor(Math.random() * 100000),
      DisplayId: user.displayId,
      Nickname: user.nickname,
      Level: Math.floor(Math.random() * 50) + 1,
      PayLevel: Math.floor(Math.random() * 10),
      Gender: Math.floor(Math.random() * 3),
      HeadImgUrl: `https://example.com/avatar/${user.displayId}.jpg`,
    },
    Content: `${user.nickname}$来了直播间人数:${Math.floor(Math.random() * 1000) + 100}`,
    RoomId: '123456789',
    WebRoomId: '987654321',
    Appid: 'douyin',
  }
  
  return {
    Type: 3, // 用户进入
    ProcessName: 'mock-server',
    Data: JSON.stringify(data),
  }
}

// 创建礼物消息
function createGiftMessage() {
  const user = getRandomUser()
  const gift = getRandomGift()
  const count = Math.floor(Math.random() * 10) + 1
  
  const data = {
    CurrentCount: Math.floor(Math.random() * 1000) + 100,
    EnterTipType: 0,
    MsgId: generateMessageId(),
    User: {
      Id: Math.floor(Math.random() * 1000000),
      ShortId: Math.floor(Math.random() * 100000),
      DisplayId: user.displayId,
      Nickname: user.nickname,
      Level: Math.floor(Math.random() * 50) + 1,
      PayLevel: Math.floor(Math.random() * 10),
      Gender: Math.floor(Math.random() * 3),
      HeadImgUrl: `https://example.com/avatar/${user.displayId}.jpg`,
    },
    GiftName: gift.name,
    GiftId: gift.id,
    GiftCount: count,
    RoomId: '123456789',
    WebRoomId: '987654321',
    Appid: 'douyin',
  }
  
  return {
    Type: 2, // 礼物消息
    ProcessName: 'mock-server',
    Data: JSON.stringify(data),
  }
}

// 创建点赞消息
function createLikeMessage() {
  const user = getRandomUser()
  
  const data = {
    CurrentCount: Math.floor(Math.random() * 1000) + 100,
    EnterTipType: 0,
    MsgId: generateMessageId(),
    User: {
      Id: Math.floor(Math.random() * 1000000),
      ShortId: Math.floor(Math.random() * 100000),
      DisplayId: user.displayId,
      Nickname: user.nickname,
      Level: Math.floor(Math.random() * 50) + 1,
      PayLevel: Math.floor(Math.random() * 10),
      Gender: Math.floor(Math.random() * 3),
      HeadImgUrl: `https://example.com/avatar/${user.displayId}.jpg`,
    },
    Content: `${user.nickname} 点赞了`,
    RoomId: '123456789',
    WebRoomId: '987654321',
    Appid: 'douyin',
  }
  
  return {
    Type: 5, // 点赞
    ProcessName: 'mock-server',
    Data: JSON.stringify(data),
  }
}

// 创建WebSocket服务器
const wss = new WebSocket.Server({ port: PORT })

console.log(`🚀 模拟WebSocket服务器启动成功！`)
console.log(`📡 监听端口: ${PORT}`)
console.log(`⏱️  消息发送间隔: ${INTERVAL}ms`)
console.log(`🔗 连接地址: ws://localhost:${PORT}`)
console.log(`👥 支持多客户端同时连接（消息会广播到所有客户端）`)
console.log(`\n按 Ctrl+C 停止服务器\n`)

// 存储所有连接的客户端
const clients = new Set()

wss.on('connection', (ws) => {
  clients.add(ws)
  console.log(`✅ 新客户端连接 (当前连接数: ${clients.size})`)
  
  // 发送欢迎消息
  ws.send(JSON.stringify({
    Type: 8, // 系统消息
    ProcessName: 'mock-server',
    Data: JSON.stringify({
      Content: '欢迎连接到模拟直播间服务器！',
      CurrentCount: 100,
    }),
  }))
  
  // 客户端断开连接
  ws.on('close', () => {
    clients.delete(ws)
    console.log(`❌ 客户端断开连接 (当前连接数: ${clients.size})`)
  })
  
  // 处理客户端消息
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString())
      console.log('📨 收到客户端消息:', data)
      
      // 可以处理客户端发送的控制命令
      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }))
      }
    } catch (error) {
      console.error('❌ 解析客户端消息失败:', error)
    }
  })
  
  // 错误处理
  ws.on('error', (error) => {
    console.error('❌ WebSocket错误:', error)
  })
})

// 定时发送模拟消息
const messageTypes = [
  { name: '弹幕', weight: 10, create: createDanmuMessage },
  { name: '用户进入', weight: 2, create: createUserEnterMessage },
  { name: '礼物', weight: 3, create: createGiftMessage },
  { name: '点赞', weight: 5, create: createLikeMessage },
]

// 根据权重选择消息类型
function selectMessageType() {
  const totalWeight = messageTypes.reduce((sum, type) => sum + type.weight, 0)
  let random = Math.random() * totalWeight
  
  for (const type of messageTypes) {
    random -= type.weight
    if (random <= 0) {
      return type
    }
  }
  return messageTypes[0]
}

// 发送消息到所有客户端
function broadcastMessage() {
  if (clients.size === 0) {
    return
  }
  
  const messageType = selectMessageType()
  const message = messageType.create()
  
  const messageContent = JSON.parse(message.Data).Content || JSON.parse(message.Data).GiftName || '消息'
  console.log(`📤 发送${messageType.name}消息到 ${clients.size} 个客户端:`, messageContent)
  
  const messageStr = JSON.stringify(message)
  let sentCount = 0
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr)
      sentCount++
    } else {
      // 清理已关闭的连接
      clients.delete(client)
    }
  })
  
  if (sentCount > 0) {
    console.log(`   ✅ 成功发送到 ${sentCount} 个客户端`)
  }
}

// 启动定时器
const intervalId = setInterval(broadcastMessage, INTERVAL)

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n\n🛑 正在关闭服务器...')
  clearInterval(intervalId)
  
  // 关闭所有客户端连接
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.close()
    }
  })
  
  // 关闭服务器
  wss.close(() => {
    console.log('✅ 服务器已关闭')
    process.exit(0)
  })
})

// 处理未捕获的错误
process.on('uncaughtException', (error) => {
  console.error('❌ 未捕获的错误:', error)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未处理的Promise拒绝:', reason)
})

