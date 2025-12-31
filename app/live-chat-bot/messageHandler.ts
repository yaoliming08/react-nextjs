/**
 * 抖音弹幕监听工具 WebSocket 消息处理
 * 根据 DouyinBarrageGrab 工具的消息格式进行解析和处理
 */

// 原始 WebSocket 消息结构
export interface RawWebSocketMessage {
  Type: number  // 消息类型编号
  ProcessName: string  // 进程名称
  Data: string  // 字符串化的 JSON 数据，需要二次解析
}

// 解析后的 Data 字段结构
export interface ParsedData {
  CurrentCount?: number  // 当前直播间人数
  EnterTipType?: number  // 进入提示类型
  MsgId?: number | string  // 消息ID
  User?: UserInfo  // 用户信息
  Onwer?: OwnerInfo  // 直播间所有者信息
  Content?: string  // 消息内容
  RoomId?: string  // 房间ID
  WebRoomId?: string  // Web房间ID
  Appid?: string  // 应用ID
  GiftName?: string  // 礼物名称
  GiftCount?: number  // 礼物数量
  GiftId?: number  // 礼物ID
  [key: string]: any  // 其他可能的字段
}

// 用户信息结构
export interface UserInfo {
  Id?: number
  ShortId?: number
  DisplayId?: string
  Nickname?: string
  Level?: number
  PayLevel?: number
  Gender?: number
  HeadImgUrl?: string
  SecUid?: string
  FollowingCount?: number
  FollowerCount?: number
  FollowStatus?: number
  IsAdmin?: boolean
  IsAnchor?: boolean
  FansClub?: {
    ClubName?: string
    Level?: number
  }
}

// 直播间所有者信息
export interface OwnerInfo {
  UserId?: string
  SecUid?: string
  Nickname?: string
  HeadUrl?: string
  FollowStatus?: number
}

// 处理后的消息类型
export type MessageType = 
  | 'user_enter'      // 用户进入直播间
  | 'user_leave'      // 用户离开直播间
  | 'danmu'           // 弹幕消息
  | 'gift'            // 礼物消息
  | 'like'            // 点赞
  | 'follow'          // 关注
  | 'share'            // 分享
  | 'system'           // 系统消息
  | 'unknown'         // 未知类型

// 处理后的消息结构
export interface ProcessedMessage {
  type: MessageType
  username: string
  content: string
  timestamp: Date
  userInfo?: UserInfo
  ownerInfo?: OwnerInfo
  roomInfo?: {
    roomId?: string
    webRoomId?: string
    currentCount?: number
  }
  giftInfo?: {
    giftName?: string
    giftCount?: number
    giftId?: number
  }
  rawData: RawWebSocketMessage
  parsedData: ParsedData
}

/**
 * 消息类型映射
 * 根据 Type 字段和 Content 内容判断消息类型
 */
const MESSAGE_TYPE_MAP: Record<number, string> = {
  1: 'danmu',      // 弹幕消息
  2: 'gift',       // 礼物消息
  3: 'user_enter', // 用户进入
  4: 'user_leave', // 用户离开
  5: 'like',       // 点赞
  6: 'follow',     // 关注
  7: 'share',      // 分享
  8: 'system',     // 系统消息
}

/**
 * 解析 WebSocket 消息
 */
export function parseWebSocketMessage(rawMessage: string | RawWebSocketMessage): ProcessedMessage | null {
  try {
    // 如果传入的是字符串，先解析为对象
    let rawData: RawWebSocketMessage
    if (typeof rawMessage === 'string') {
      rawData = JSON.parse(rawMessage)
    } else {
      rawData = rawMessage
    }

    // 解析 Data 字段（它是字符串化的 JSON）
    let parsedData: ParsedData
    try {
      parsedData = JSON.parse(rawData.Data)
    } catch (error) {
      console.error('解析 Data 字段失败:', error)
      return null
    }

    // 获取用户信息
    const userInfo = parsedData.User
    const username = userInfo?.Nickname || userInfo?.DisplayId || '未知用户'
    
    // 获取内容
    const content = parsedData.Content || ''
    
    // 判断消息类型
    const messageType = detectMessageType(rawData.Type, content, parsedData)

    // 构建处理后的消息
    const processedMessage: ProcessedMessage = {
      type: messageType,
      username,
      content: formatContent(content, messageType, parsedData),
      timestamp: new Date(),
      userInfo,
      ownerInfo: parsedData.Onwer,
      roomInfo: {
        roomId: parsedData.RoomId,
        webRoomId: parsedData.WebRoomId,
        currentCount: parsedData.CurrentCount,
      },
      giftInfo: parsedData.GiftName ? {
        giftName: parsedData.GiftName,
        giftCount: parsedData.GiftCount || 1,
        giftId: parsedData.GiftId,
      } : undefined,
      rawData,
      parsedData,
    }

    return processedMessage
  } catch (error) {
    console.error('解析消息失败:', error)
    return null
  }
}

/**
 * 检测消息类型
 */
function detectMessageType(type: number, content: string, parsedData: ParsedData): MessageType {
  // 优先根据 Type 字段判断
  if (MESSAGE_TYPE_MAP[type]) {
    return MESSAGE_TYPE_MAP[type] as MessageType
  }

  // 根据 Content 内容判断
  if (content) {
    // 用户进入直播间：包含 "$来了" 或 "来了直播间"
    if (content.includes('$来了') || content.includes('来了直播间') || content.includes('进入直播间')) {
      return 'user_enter'
    }
    
    // 用户离开直播间
    if (content.includes('离开') || content.includes('退出')) {
      return 'user_leave'
    }
    
    // 礼物消息：有 GiftName 字段
    if (parsedData.GiftName || parsedData.GiftId) {
      return 'gift'
    }
    
    // 点赞
    if (content.includes('点赞') || content.includes('like')) {
      return 'like'
    }
    
    // 关注
    if (content.includes('关注') || content.includes('follow')) {
      return 'follow'
    }
    
    // 分享
    if (content.includes('分享') || content.includes('share')) {
      return 'share'
    }
    
    // 系统消息
    if (content.includes('系统') || content.includes('system')) {
      return 'system'
    }
    
    // 默认作为弹幕消息
    return 'danmu'
  }

  // 根据其他字段判断
  if (parsedData.GiftName) {
    return 'gift'
  }

  if (parsedData.EnterTipType !== undefined) {
    return parsedData.EnterTipType === 0 ? 'user_enter' : 'user_leave'
  }

  return 'unknown'
}

/**
 * 格式化消息内容
 */
function formatContent(content: string, type: MessageType, parsedData: ParsedData): string {
  switch (type) {
    case 'user_enter':
      // 提取用户名（去掉 "$来了直播间人数:xxx" 部分）
      const enterMatch = content.match(/^(.+?)\s*\$/)?.[1] || content
      return `进入了直播间${parsedData.CurrentCount ? ` (当前人数: ${parsedData.CurrentCount})` : ''}`
    
    case 'user_leave':
      return '离开了直播间'
    
    case 'gift':
      const giftName = parsedData.GiftName || '礼物'
      const giftCount = parsedData.GiftCount || 1
      return `送出了 ${giftName}${giftCount > 1 ? ` x${giftCount}` : ''}`
    
    case 'like':
      return '点赞了'
    
    case 'follow':
      return '关注了直播间'
    
    case 'share':
      return '分享了直播间'
    
    case 'danmu':
      return content
    
    case 'system':
      return content
    
    default:
      return content || '未知消息'
  }
}

/**
 * 获取用户昵称（用于语音播报等）
 */
export function getUserNickname(message: ProcessedMessage): string {
  return message.userInfo?.Nickname 
    || message.userInfo?.DisplayId 
    || message.username 
    || '用户'
}

/**
 * 判断是否为用户进入直播间消息
 */
export function isUserEnterMessage(message: ProcessedMessage): boolean {
  return message.type === 'user_enter'
}

/**
 * 判断是否为礼物消息
 */
export function isGiftMessage(message: ProcessedMessage): boolean {
  return message.type === 'gift'
}

/**
 * 判断是否为弹幕消息
 */
export function isDanmuMessage(message: ProcessedMessage): boolean {
  return message.type === 'danmu'
}

/**
 * 获取消息类型的中文描述
 */
export function getMessageTypeLabel(type: MessageType): string {
  const labels: Record<MessageType, string> = {
    'user_enter': '进入直播间',
    'user_leave': '离开直播间',
    'danmu': '弹幕',
    'gift': '礼物',
    'like': '点赞',
    'follow': '关注',
    'share': '分享',
    'system': '系统消息',
    'unknown': '未知',
  }
  return labels[type] || '未知'
}

/**
 * 获取消息类型的图标
 */
export function getMessageTypeIcon(type: MessageType): string {
  const icons: Record<MessageType, string> = {
    'user_enter': '👋',
    'user_leave': '👋',
    'danmu': '💬',
    'gift': '🎁',
    'like': '👍',
    'follow': '➕',
    'share': '📤',
    'system': '📢',
    'unknown': '❓',
  }
  return icons[type] || '❓'
}

/**
 * 获取消息类型的颜色类名（Tailwind CSS）
 */
export function getMessageTypeColor(type: MessageType): string {
  const colors: Record<MessageType, string> = {
    'user_enter': 'bg-green-100 border-green-300 text-green-800',
    'user_leave': 'bg-gray-100 border-gray-300 text-gray-800',
    'danmu': 'bg-blue-100 border-blue-300 text-blue-800',
    'gift': 'bg-yellow-100 border-yellow-300 text-yellow-800',
    'like': 'bg-pink-100 border-pink-300 text-pink-800',
    'follow': 'bg-purple-100 border-purple-300 text-purple-800',
    'share': 'bg-indigo-100 border-indigo-300 text-indigo-800',
    'system': 'bg-gray-100 border-gray-300 text-gray-800',
    'unknown': 'bg-gray-100 border-gray-300 text-gray-800',
  }
  return colors[type] || 'bg-gray-100 border-gray-300 text-gray-800'
}


