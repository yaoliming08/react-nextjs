# 文本转语音（TTS）方案说明

本项目提供了多种TTS方案，可以根据需求选择最适合的方案。

## 已实现的方案

### 方案1：浏览器原生 Web Speech API ✅（推荐用于快速实现）

**优点：**
- ✅ 无需额外服务或API密钥
- ✅ 零成本，完全免费
- ✅ 简单易用，开箱即用
- ✅ 支持多种语言和语音

**缺点：**
- ❌ 语音质量一般（取决于浏览器）
- ❌ 不同浏览器体验差异较大
- ❌ 需要用户交互才能播放（某些浏览器限制）

**使用示例：**
```typescript
import { speakText, stopSpeaking } from '@/app/lib/tts'

// 播放文本
await speakText('你好，我是AI助手', {
  lang: 'zh-CN',
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0
})

// 停止播放
stopSpeaking()
```

**浏览器支持：**
- Chrome/Edge: ✅ 完全支持
- Firefox: ✅ 支持
- Safari: ✅ 支持
- 移动端浏览器: ⚠️ 部分支持

---

## 其他可选方案（需要额外实现）

### 方案2：Edge TTS（微软Edge TTS服务）

**优点：**
- ✅ 语音质量好，接近真人
- ✅ 免费使用
- ✅ 支持多种中文语音（男声/女声）

**缺点：**
- ❌ 需要调用外部API
- ❌ 可能需要后端代理（避免CORS问题）
- ❌ 响应速度较慢

**实现建议：**
1. 创建后端API路由 `/api/tts/edge`
2. 使用 Edge TTS 库或直接调用API
3. 返回音频流或Blob

**推荐库：**
- `edge-tts` (Python)
- 或直接调用 Edge TTS API

---

### 方案3：第三方TTS服务

#### 3.1 百度语音合成
- **优点：** 语音质量好，支持多种音色
- **缺点：** 需要API密钥，有调用限制
- **文档：** https://ai.baidu.com/ai-doc/SPEECH/Qk38y8lrl

#### 3.2 阿里云语音合成
- **优点：** 语音质量优秀，稳定性好
- **缺点：** 需要付费，配置复杂
- **文档：** https://help.aliyun.com/product/84430.html

#### 3.3 腾讯云语音合成
- **优点：** 语音质量好，价格合理
- **缺点：** 需要API密钥和配置
- **文档：** https://cloud.tencent.com/document/product/1073

**实现建议：**
1. 创建后端API路由 `/api/tts`
2. 在服务端调用TTS服务
3. 返回音频流或Blob
4. 前端通过 `<audio>` 标签播放

---

## 当前实现的功能

### 聊天页面语音功能

1. **自动播放AI回复** ✅
   - 在顶部导航栏可以开启/关闭自动播放
   - AI回复后自动播放语音

2. **手动播放按钮** ✅
   - 每条AI回复消息都有播放按钮
   - 点击播放/停止
   - 播放时按钮显示为停止图标

3. **语音队列管理** ✅
   - 自动停止当前播放，播放新消息
   - 组件卸载时自动清理

---

## 使用建议

### 快速开始（推荐）
使用方案1（浏览器原生API），已经集成到聊天页面，无需额外配置。

### 追求语音质量
如果需要更好的语音质量，可以考虑：
1. 实现方案2（Edge TTS）- 免费且质量好
2. 或使用方案3（第三方服务）- 需要付费但质量最佳

### 实现Edge TTS的步骤

1. **安装依赖（如果需要）：**
```bash
# 如果使用Node.js后端
npm install edge-tts
```

2. **创建API路由：**
```typescript
// app/api/tts/edge/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { text, voice = 'zh-CN-XiaoxiaoNeural' } = await request.json()
  
  // 调用Edge TTS API
  // 返回音频流
  // ...
}
```

3. **前端调用：**
```typescript
const response = await fetch('/api/tts/edge', {
  method: 'POST',
  body: JSON.stringify({ text: '你好' })
})
const audioBlob = await response.blob()
const audioUrl = URL.createObjectURL(audioBlob)
// 使用 <audio> 标签播放
```

---

## 配置选项

### BrowserTTS 配置

```typescript
interface TTSOptions {
  lang?: string        // 语言，默认 'zh-CN'
  rate?: number        // 语速 (0.1-10)，默认 1.0
  pitch?: number       // 音调 (0-2)，默认 1.0
  volume?: number      // 音量 (0-1)，默认 1.0
  voice?: SpeechSynthesisVoice  // 指定语音
  onStart?: () => void
  onEnd?: () => void
  onError?: (error: Error) => void
}
```

### 获取可用语音

```typescript
import { BrowserTTS } from '@/app/lib/tts'

const tts = BrowserTTS.getInstance()
const chineseVoices = tts.getChineseVoices()
const bestVoice = tts.getBestChineseVoice()
```

---

## 注意事项

1. **浏览器兼容性：** 某些浏览器（特别是移动端）可能不支持或有限制
2. **用户交互要求：** 某些浏览器要求用户先进行交互才能播放语音
3. **性能考虑：** 长文本可能需要较长时间合成
4. **隐私考虑：** 使用第三方服务时，注意数据隐私

---

## 未来改进方向

- [ ] 实现Edge TTS后端API
- [ ] 添加语音缓存机制
- [ ] 支持更多语音选项（语速、音调等）的用户设置
- [ ] 添加语音下载功能
- [ ] 支持流式播放（边生成边播放）

