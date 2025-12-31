# 模拟WebSocket服务器使用说明

## 功能说明

这个模拟WebSocket服务器用于测试直播间回复机器人页面，模拟真实的直播间消息流。

## 安装依赖

```bash
npm install ws --save-dev
```

## 启动服务器

### 方法1：使用npm脚本（推荐）

```bash
npm run mock:websocket
```

### 方法2：直接运行

```bash
node scripts/mock-websocket-server.js
```

### 方法3：自定义端口和间隔

```bash
# 自定义端口
PORT=9999 node scripts/mock-websocket-server.js

# 自定义消息发送间隔（毫秒）
INTERVAL=3000 node scripts/mock-websocket-server.js

# 同时自定义
PORT=9999 INTERVAL=3000 node scripts/mock-websocket-server.js
```

## 配置说明

### 默认配置

- **端口**: 8888
- **消息发送间隔**: 5000ms (5秒)
- **WebSocket地址**: `ws://localhost:8888`

### 环境变量

- `PORT`: WebSocket服务器端口（默认：8888）
- `INTERVAL`: 消息发送间隔，单位毫秒（默认：5000）

## 模拟的消息类型

服务器会随机发送以下类型的消息：

1. **弹幕消息** (Type: 1) - 权重：10
   - 随机用户发送的弹幕内容
   - 包含用户信息、消息内容等

2. **用户进入** (Type: 3) - 权重：2
   - 模拟用户进入直播间
   - 格式：`{username}$来了直播间人数:XXX`

3. **礼物消息** (Type: 2) - 权重：3
   - 模拟用户送礼物
   - 包含礼物名称、数量等

4. **点赞消息** (Type: 5) - 权重：5
   - 模拟用户点赞

## 消息格式

服务器发送的消息格式与真实直播间消息格式完全一致：

```json
{
  "Type": 1,
  "ProcessName": "mock-server",
  "Data": "{\"Content\":\"大家好！\",\"User\":{\"Nickname\":\"小明\",...}}"
}
```

## 使用步骤

1. **启动模拟服务器**：
   ```bash
   npm run mock:websocket
   ```

2. **打开直播间回复机器人页面**：
   - 访问：`http://localhost:3000/live-chat-bot`
   - 页面会自动连接到 `ws://localhost:8888`

3. **观察效果**：
   - 服务器每5秒发送一条随机消息
   - 页面收到弹幕消息后会自动调用AI
   - AI回复会显示在页面上并播放语音

## 自定义消息内容

可以编辑 `scripts/mock-websocket-server.js` 文件来自定义：

- **用户列表**: 修改 `mockUsers` 数组
- **弹幕内容**: 修改 `mockDanmuMessages` 数组
- **礼物列表**: 修改 `mockGifts` 数组
- **消息权重**: 修改 `messageTypes` 数组中的 `weight` 值

## 停止服务器

按 `Ctrl+C` 停止服务器

## 注意事项

1. 确保端口8888没有被其他程序占用
2. 如果修改了端口，需要在配置管理页面更新WebSocket URL
3. 服务器支持多个客户端同时连接
4. 所有连接的客户端都会收到相同的消息

## 故障排查

### 端口被占用

如果8888端口被占用，可以：
1. 修改环境变量：`PORT=9999 npm run mock:websocket`
2. 或者在配置管理页面修改WebSocket URL

### 连接失败

1. 检查服务器是否正在运行
2. 检查防火墙设置
3. 确认WebSocket URL配置正确

### 没有收到消息

1. 检查服务器控制台是否有输出
2. 确认页面已连接到WebSocket
3. 检查浏览器控制台是否有错误

