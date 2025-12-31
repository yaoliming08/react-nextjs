# 直播间回复机器人 - 消息处理说明

## 消息处理架构

本项目使用 `messageHandler.ts` 文件统一处理来自抖音弹幕监听工具（DouyinBarrageGrab）的 WebSocket 消息。

## WebSocket 消息格式

### 原始消息结构

```typescript
{
  "Type": number,        // 消息类型编号
  "ProcessName": string, // 进程名称（如 "quark"）
  "Data": string         // 字符串化的 JSON，需要二次解析
}
```

### Data 字段结构（解析后）

```typescript
{
  "CurrentCount": number,     // 当前直播间人数
  "EnterTipType": number,     // 进入提示类型（0=进入，其他=离开）
  "MsgId": number,            // 消息ID
  "User": {                   // 用户信息
    "Nickname": string,       // 用户昵称
    "DisplayId": string,     // 显示ID
    "HeadImgUrl": string,     // 头像URL
    "Level": number,          // 等级
    "PayLevel": number,       // 付费等级
    // ... 更多用户信息
  },
  "Onwer": {                  // 直播间所有者信息
    "Nickname": string,
    "UserId": string,
    // ...
  },
  "Content": string,          // 消息内容
  "RoomId": string,          // 房间ID
  "WebRoomId": string,       // Web房间ID
  "GiftName": string,        // 礼物名称（礼物消息）
  "GiftCount": number,       // 礼物数量（礼物消息）
  // ... 其他字段
}
```

## 支持的消息类型

### 1. 用户进入直播间 (`user_enter`)

**识别方式：**
- `Type === 3`
- `Content` 包含 `"$来了"` 或 `"来了直播间"`
- `EnterTipType === 0`

**示例 Content：**
```
"L_ $来了直播间人数:195"
"@哲$来了直播间人数:180"
```

**处理：**
- 提取用户名（Content 中 `$` 前的部分）
- 显示进入消息
- 触发语音播报：`欢迎 {username} 进入直播间`

### 2. 用户离开直播间 (`user_leave`)

**识别方式：**
- `Content` 包含 `"离开"` 或 `"退出"`
- `EnterTipType !== 0`

**处理：**
- 显示离开消息

### 3. 弹幕消息 (`danmu`)

**识别方式：**
- `Type === 1`
- 普通文本消息，不包含特殊标识

**处理：**
- 显示弹幕内容
- 支持关键词自动回复

### 4. 礼物消息 (`gift`)

**识别方式：**
- `Type === 2`
- 存在 `GiftName` 或 `GiftId` 字段

**处理：**
- 显示礼物信息（名称、数量）
- 触发语音播报：`{username} 送出了 {giftName}`

### 5. 点赞 (`like`)

**识别方式：**
- `Type === 5`
- `Content` 包含 `"点赞"` 或 `"like"`

**处理：**
- 显示点赞消息

### 6. 关注 (`follow`)

**识别方式：**
- `Type === 6`
- `Content` 包含 `"关注"` 或 `"follow"`

**处理：**
- 显示关注消息

### 7. 分享 (`share`)

**识别方式：**
- `Type === 7`
- `Content` 包含 `"分享"` 或 `"share"`

**处理：**
- 显示分享消息

### 8. 系统消息 (`system`)

**识别方式：**
- `Type === 8`
- `Content` 包含 `"系统"` 或 `"system"`

**处理：**
- 显示系统消息

## 消息类型映射表

| Type 值 | 消息类型 | 说明 |
|---------|---------|------|
| 1 | `danmu` | 弹幕消息 |
| 2 | `gift` | 礼物消息 |
| 3 | `user_enter` | 用户进入直播间 |
| 4 | `user_leave` | 用户离开直播间 |
| 5 | `like` | 点赞 |
| 6 | `follow` | 关注 |
| 7 | `share` | 分享 |
| 8 | `system` | 系统消息 |

## 使用方法

### 1. 导入消息处理器

```typescript
import {
  parseWebSocketMessage,
  ProcessedMessage,
  getUserNickname,
  isUserEnterMessage,
  isGiftMessage,
  getMessageTypeIcon,
  getMessageTypeColor,
} from './messageHandler'
```

### 2. 解析 WebSocket 消息

```typescript
ws.onmessage = (event) => {
  const processedMessage = parseWebSocketMessage(event.data)
  
  if (processedMessage) {
    // 处理消息
    handleMessage(processedMessage)
  }
}
```

### 3. 处理特定类型的消息

```typescript
function handleMessage(message: ProcessedMessage) {
  if (isUserEnterMessage(message)) {
    // 用户进入直播间
    const username = getUserNickname(message)
    speak(`欢迎 ${username} 进入直播间`)
  } else if (isGiftMessage(message)) {
    // 礼物消息
    const giftName = message.giftInfo?.giftName
    speak(`${getUserNickname(message)} 送出了 ${giftName}`)
  }
}
```

## 工具函数

### `parseWebSocketMessage(rawMessage)`
解析原始 WebSocket 消息，返回 `ProcessedMessage` 对象。

### `getUserNickname(message)`
获取用户昵称，优先级：`User.Nickname` > `User.DisplayId` > `username` > `'用户'`

### `isUserEnterMessage(message)`
判断是否为用户进入直播间消息。

### `isGiftMessage(message)`
判断是否为礼物消息。

### `isDanmuMessage(message)`
判断是否为弹幕消息。

### `getMessageTypeIcon(type)`
获取消息类型的图标（emoji）。

### `getMessageTypeColor(type)`
获取消息类型的 Tailwind CSS 颜色类名。

### `getMessageTypeLabel(type)`
获取消息类型的中文标签。

## 注意事项

1. **Data 字段需要二次解析**：原始消息的 `Data` 字段是字符串化的 JSON，需要先解析外层 JSON，再解析 `Data` 字段。

2. **消息类型判断优先级**：
   - 首先根据 `Type` 字段判断
   - 其次根据 `Content` 内容判断
   - 最后根据其他字段（如 `GiftName`）判断

3. **用户名提取**：从 `Content` 字段中提取用户名时，会去掉 `$` 及后面的内容。

4. **语音播报**：目前仅对 `user_enter` 和 `gift` 类型消息进行语音播报，避免过于频繁。

## 扩展新消息类型

如果需要支持新的消息类型：

1. 在 `messageHandler.ts` 的 `MessageType` 类型中添加新类型
2. 在 `detectMessageType()` 函数中添加识别逻辑
3. 在 `formatContent()` 函数中添加格式化逻辑
4. 在 `getMessageTypeIcon()` 和 `getMessageTypeColor()` 中添加对应的图标和颜色


