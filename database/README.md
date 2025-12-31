# 聊天配置数据库说明

## 数据库配置

根据项目配置，数据库连接信息如下：

```javascript
{
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '199808',
  database: 'xl'
}
```

## 初始化数据库表

1. **连接到MySQL数据库：**
```bash
mysql -u root -p
# 输入密码：199808
```

2. **选择数据库：**
```sql
USE xl;
```

3. **执行SQL脚本创建表：**
```bash
# 在项目根目录执行
mysql -u root -p199808 xl < database/chat_config.sql
```

或者直接在MySQL客户端中执行 `database/chat_config.sql` 文件中的SQL语句。

## 表结构说明

### chat_config 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 配置ID（主键，自增） |
| page_key | VARCHAR(100) | 页面标识（唯一，如：chat, live-chat-bot） |
| page_name | VARCHAR(200) | 页面名称 |
| config_data | JSON | 配置数据（JSON格式） |
| is_active | TINYINT(1) | 是否启用（1-启用，0-禁用） |
| description | TEXT | 配置描述 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

## 配置数据格式

### 聊天页面配置示例（page_key: 'chat'）

```json
{
  "tts": {
    "type": "browser",
    "autoPlay": true,
    "edgeOptions": {
      "voice": "zh-CN-XiaoxiaoNeural",
      "rate": "+0%",
      "pitch": "+0Hz"
    },
    "thirdPartyOptions": {
      "provider": "baidu"
    }
  },
  "ai": {
    "model": "doubao-seed-1-6-251015",
    "temperature": 0.7,
    "maxTokens": 200,
    "systemPrompt": "你是一个直播间助手，负责回复直播间观众的问题。回复要简洁、友好、有趣，控制在50字以内。"
  }
}
```

### 直播间聊天机器人配置示例（page_key: 'live-chat-bot'）

```json
{
  "tts": {
    "type": "browser",
    "autoPlay": true,
    "voiceEnabled": true
  },
  "ai": {
    "enabled": true,
    "model": "doubao-seed-1-6-251015",
    "temperature": 0.7,
    "maxTokens": 200
  },
  "autoReply": {
    "enabled": false,
    "keywords": "",
    "message": "感谢您的支持！"
  }
}
```

## API接口说明

### 获取配置

```bash
# 获取所有配置列表
GET /api/chat-config

# 根据页面标识获取配置
GET /api/chat-config?page_key=chat

# 根据ID获取配置
GET /api/chat-config?id=1
```

### 创建配置

```bash
POST /api/chat-config
Content-Type: application/json

{
  "page_key": "chat",
  "page_name": "机器人聊天页面",
  "config_data": { ... },
  "description": "配置描述",
  "is_active": 1
}
```

### 更新配置

```bash
PUT /api/chat-config
Content-Type: application/json

{
  "id": 1,
  "page_key": "chat",
  "page_name": "机器人聊天页面",
  "config_data": { ... },
  "is_active": 1
}
```

### 删除配置

```bash
DELETE /api/chat-config?id=1
```

## 使用方式

1. **访问配置管理页面：**
   - 直接访问：`http://localhost:3000/chat-config`
   - 或在聊天页面点击右上角的设置图标

2. **创建/编辑配置：**
   - 点击"新建配置"或"编辑"按钮
   - 填写配置信息
   - 配置数据使用JSON格式

3. **在代码中使用配置：**
   - 聊天页面会自动从API获取配置（page_key: 'chat'）
   - 其他页面可以通过API获取对应配置

## 注意事项

1. **page_key 必须唯一**：每个页面标识只能有一个配置
2. **config_data 必须是有效的JSON**：配置数据需要是有效的JSON格式
3. **is_active 控制启用状态**：只有启用的配置才会被使用
4. **配置更新后需要刷新页面**：配置更新后，相关页面需要刷新才能生效

