# TTS（文本转语音）配置说明

本项目支持三种TTS方案，可以通过配置切换使用。

## 三种TTS方案

### 方案1：浏览器原生API（默认）✅

**优点：**
- ✅ 无需配置，零成本
- ✅ 开箱即用
- ✅ 无需网络请求

**缺点：**
- ❌ 语音质量一般
- ❌ 不同浏览器体验差异大

**配置：**
- 默认方案，无需配置
- 在聊天页面顶部可以切换

---

### 方案2：Edge TTS

**优点：**
- ✅ 语音质量好，接近真人
- ✅ 免费使用
- ✅ 支持多种中文语音（男声/女声）

**缺点：**
- ❌ 需要后端API支持
- ❌ 需要网络请求

**配置：**

1. **环境变量（可选）：**
```bash
TTS_TYPE=edge
EDGE_TTS_VOICE=zh-CN-XiaoxiaoNeural  # 默认语音
EDGE_TTS_RATE=+0%                    # 语速
EDGE_TTS_PITCH=+0Hz                  # 音调
```

2. **可用的Edge TTS语音：**
- `zh-CN-XiaoxiaoNeural` - 晓晓（女声，自然）
- `zh-CN-XiaoyiNeural` - 晓伊（女声，温柔）
- `zh-CN-XiaohanNeural` - 晓涵（女声，活泼）
- `zh-CN-YunxiNeural` - 云希（男声，自然）
- `zh-CN-YunyangNeural` - 云扬（男声，沉稳）
- 更多语音见 `config/tts.ts`

**注意：**
- Edge TTS的API路由已创建（`app/api/tts/edge/route.ts`）
- 实际使用时可能需要安装 `edge-tts` 库或使用WebSocket实现
- 当前实现为简化版本，可能需要进一步优化

---

### 方案3：第三方TTS服务

**优点：**
- ✅ 语音质量最佳
- ✅ 稳定可靠
- ✅ 支持多种音色和参数

**缺点：**
- ❌ 需要API密钥
- ❌ 可能需要付费
- ❌ 需要配置环境变量

**支持的提供商：**
- 百度语音合成
- 阿里云语音合成
- 腾讯云语音合成

**配置：**

1. **环境变量：**
```bash
TTS_TYPE=third-party
TTS_PROVIDER=baidu  # 或 aliyun, tencent
```

2. **百度TTS配置：**
```bash
BAIDU_TTS_API_KEY=your_api_key
BAIDU_TTS_SECRET_KEY=your_secret_key
```

3. **阿里云TTS配置：**
```bash
ALIYUN_TTS_ACCESS_KEY_ID=your_access_key_id
ALIYUN_TTS_ACCESS_KEY_SECRET=your_access_key_secret
ALIYUN_TTS_APP_KEY=your_app_key
```

4. **腾讯云TTS配置：**
```bash
TENCENT_TTS_SECRET_ID=your_secret_id
TENCENT_TTS_SECRET_KEY=your_secret_key
```

**注意：**
- 第三方TTS的API路由已创建（`app/api/tts/third-party/route.ts`）
- 百度TTS已实现基本功能
- 阿里云和腾讯云需要安装相应的SDK才能完整实现

---

## 使用方式

### 1. 在聊天页面切换

1. 打开聊天页面（`/chat`）
2. 点击顶部导航栏右侧的"设置"按钮（齿轮图标）
3. 选择TTS方案：
   - 浏览器原生API
   - Edge TTS
   - 第三方TTS

### 2. 通过环境变量配置（服务端默认）

在 `.env.local` 文件中设置：
```bash
# 选择TTS方案
TTS_TYPE=browser  # 或 edge, third-party

# Edge TTS配置（如果使用edge）
EDGE_TTS_VOICE=zh-CN-XiaoxiaoNeural
EDGE_TTS_RATE=+0%
EDGE_TTS_PITCH=+0Hz

# 第三方TTS配置（如果使用third-party）
TTS_PROVIDER=baidu
BAIDU_TTS_API_KEY=your_key
BAIDU_TTS_SECRET_KEY=your_secret
```

### 3. 客户端配置（localStorage）

客户端配置会自动保存到 `localStorage`，下次访问时会自动加载。

---

## 代码示例

### 使用统一TTS管理器

```typescript
import { speakText, stopSpeaking, setClientTTSConfig } from '@/app/lib/tts'
import type { TTSType } from '@/config/tts'

// 设置TTS方案
setClientTTSConfig('browser') // 或 'edge', 'third-party'

// 播放文本
await speakText('你好，我是AI助手', {
  ttsType: 'browser',
  onStart: () => console.log('开始播放'),
  onEnd: () => console.log('播放结束'),
  onError: (error) => console.error('播放失败', error)
})

// 停止播放
stopSpeaking()
```

### 使用Edge TTS

```typescript
await speakText('你好', {
  ttsType: 'edge',
  edgeOptions: {
    voice: 'zh-CN-XiaoxiaoNeural',
    rate: '+0%',
    pitch: '+0Hz'
  }
})
```

### 使用第三方TTS

```typescript
await speakText('你好', {
  ttsType: 'third-party',
  thirdPartyOptions: {
    provider: 'baidu',
    voice: 'zh',
    speed: 5,
    pitch: 5
  }
})
```

---

## 注意事项

1. **浏览器兼容性：**
   - 浏览器原生API需要浏览器支持 `speechSynthesis`
   - Edge TTS和第三方TTS通过API调用，不依赖浏览器

2. **网络要求：**
   - Edge TTS和第三方TTS需要网络连接
   - 建议添加错误处理和重试机制

3. **API密钥安全：**
   - 第三方TTS的API密钥应通过环境变量配置
   - 不要将密钥提交到代码仓库

4. **性能考虑：**
   - Edge TTS和第三方TTS需要网络请求，可能有延迟
   - 建议添加加载状态提示

5. **Edge TTS实现：**
   - 当前Edge TTS实现为简化版本
   - 生产环境建议使用 `edge-tts` npm包或WebSocket实现

---

## 故障排查

### 浏览器原生API不工作
- 检查浏览器是否支持 `speechSynthesis`
- 某些浏览器需要用户交互后才能播放
- 检查浏览器控制台是否有错误

### Edge TTS失败
- 检查网络连接
- 查看后端API路由是否正确
- 可能需要安装 `edge-tts` 库

### 第三方TTS失败
- 检查API密钥是否正确配置
- 检查环境变量是否设置
- 查看后端API路由日志
- 确认API配额是否充足

---

## 未来改进

- [ ] 完善Edge TTS的WebSocket实现
- [ ] 实现阿里云和腾讯云TTS的完整功能
- [ ] 添加语音缓存机制
- [ ] 支持更多语音参数配置
- [ ] 添加语音预览功能

