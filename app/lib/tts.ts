/**
 * 文本转语音（TTS）工具
 * 支持多种TTS方案：浏览器原生API、Edge TTS、第三方TTS服务
 */

import type { TTSType, TTSConfig } from '@/config/tts'

export interface TTSOptions {
  lang?: string // 语言，默认 'zh-CN'
  rate?: number // 语速 (0.1 到 10)，默认 1.0
  pitch?: number // 音调 (0 到 2)，默认 1.0
  volume?: number // 音量 (0 到 1)，默认 1.0
  voice?: SpeechSynthesisVoice // 指定语音（仅浏览器TTS）
  onStart?: () => void
  onEnd?: () => void
  onError?: (error: Error) => void
}

// 客户端TTS配置（可以从localStorage读取）
let clientTTSConfig: TTSType = 'browser'

/**
 * 设置客户端TTS配置
 */
export function setClientTTSConfig(type: TTSType) {
  clientTTSConfig = type
  if (typeof window !== 'undefined') {
    localStorage.setItem('tts_type', type)
  }
}

/**
 * 获取客户端TTS配置
 */
export function getClientTTSConfig(): TTSType {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('tts_type')
    if (saved && ['browser', 'edge', 'third-party'].includes(saved)) {
      return saved as TTSType
    }
  }
  return clientTTSConfig
}

/**
 * 方案1：浏览器原生 Web Speech API
 * 优点：无需额外服务，简单易用
 * 缺点：语音质量一般，依赖浏览器支持
 */
export class BrowserTTS {
  private static instance: BrowserTTS | null = null
  private isSpeaking = false
  private currentUtterance: SpeechSynthesisUtterance | null = null

  private constructor() {
    // 初始化语音列表
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices()
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices()
      }
    }
  }

  static getInstance(): BrowserTTS {
    if (!BrowserTTS.instance) {
      BrowserTTS.instance = new BrowserTTS()
    }
    return BrowserTTS.instance
  }

  /**
   * 检查浏览器是否支持TTS
   */
  isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window
  }

  /**
   * 获取可用的中文语音列表
   */
  getChineseVoices(): SpeechSynthesisVoice[] {
    if (!this.isSupported()) return []
    const voices = window.speechSynthesis.getVoices()
    return voices.filter(voice => 
      voice.lang.includes('zh') || 
      voice.lang.includes('CN') ||
      voice.name.toLowerCase().includes('chinese')
    )
  }

  /**
   * 获取最佳中文语音
   */
  getBestChineseVoice(): SpeechSynthesisVoice | null {
    const chineseVoices = this.getChineseVoices()
    if (chineseVoices.length === 0) return null
    
    // 优先选择本地语音（localService）
    const localVoice = chineseVoices.find(v => v.localService)
    if (localVoice) return localVoice
    
    // 其次选择默认语音
    const defaultVoice = chineseVoices.find(v => v.default)
    if (defaultVoice) return defaultVoice
    
    // 返回第一个
    return chineseVoices[0]
  }

  /**
   * 播放文本
   */
  speak(text: string, options: TTSOptions = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isSupported()) {
        const error = new Error('浏览器不支持语音合成功能')
        options.onError?.(error)
        reject(error)
        return
      }

      // 停止当前播放
      this.stop()

      const utterance = new SpeechSynthesisUtterance(text)
      
      // 设置语音参数
      utterance.lang = options.lang || 'zh-CN'
      utterance.rate = options.rate ?? 1.0
      utterance.pitch = options.pitch ?? 1.0
      utterance.volume = options.volume ?? 1.0

      // 选择语音
      if (options.voice) {
        utterance.voice = options.voice
      } else {
        const bestVoice = this.getBestChineseVoice()
        if (bestVoice) {
          utterance.voice = bestVoice
        }
      }

      // 事件处理
      utterance.onstart = () => {
        this.isSpeaking = true
        this.currentUtterance = utterance
        options.onStart?.()
      }

      utterance.onend = () => {
        this.isSpeaking = false
        this.currentUtterance = null
        options.onEnd?.()
        resolve()
      }

      utterance.onerror = (event) => {
        this.isSpeaking = false
        this.currentUtterance = null
        const error = new Error(`语音合成错误: ${event.error}`)
        options.onError?.(error)
        reject(error)
      }

      window.speechSynthesis.speak(utterance)
    })
  }

  /**
   * 停止播放
   */
  stop(): void {
    if (this.isSupported() && this.isSpeaking) {
      window.speechSynthesis.cancel()
      this.isSpeaking = false
      this.currentUtterance = null
    }
  }

  /**
   * 暂停播放
   */
  pause(): void {
    if (this.isSupported() && this.isSpeaking) {
      window.speechSynthesis.pause()
    }
  }

  /**
   * 恢复播放
   */
  resume(): void {
    if (this.isSupported()) {
      window.speechSynthesis.resume()
    }
  }

  /**
   * 是否正在播放
   */
  getIsSpeaking(): boolean {
    return this.isSpeaking
  }
}

/**
 * 方案2：Edge TTS（微软Edge浏览器的TTS服务）
 * 优点：语音质量好，免费
 * 缺点：需要调用外部API
 */
export async function speakWithEdgeTTS(
  text: string,
  options: { voice?: string; rate?: string; pitch?: string } = {}
): Promise<void> {
  const voice = options.voice || 'zh-CN-XiaoxiaoNeural'
  const rate = options.rate || '+0%'
  const pitch = options.pitch || '+0Hz'

  try {
    // 通过后端API调用Edge TTS
    const response = await fetch('/api/tts/edge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        voice,
        rate,
        pitch,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || `Edge TTS请求失败: ${response.status}`)
    }

    // 获取音频数据
    const audioBlob = await response.blob()
    const audioUrl = URL.createObjectURL(audioBlob)
    
    // 使用Audio对象播放
    const audio = new Audio(audioUrl)
    
    return new Promise((resolve, reject) => {
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl)
        resolve()
      }
      audio.onerror = (error) => {
        URL.revokeObjectURL(audioUrl)
        reject(new Error('音频播放失败'))
      }
      audio.play().catch(reject)
    })
  } catch (error) {
    throw error instanceof Error ? error : new Error('Edge TTS调用失败')
  }
}

/**
 * 方案3：使用第三方TTS服务（如百度、阿里云等）
 * 需要配置相应的API密钥
 */
export interface ThirdPartyTTSOptions {
  provider: 'baidu' | 'aliyun' | 'tencent'
  voice?: string
  speed?: number
  pitch?: number
}

export async function speakWithThirdPartyTTS(
  text: string,
  options: ThirdPartyTTSOptions
): Promise<void> {
  try {
    const response = await fetch('/api/tts/third-party', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        provider: options.provider,
        voice: options.voice,
        speed: options.speed,
        pitch: options.pitch,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || `第三方TTS请求失败: ${response.status}`)
    }

    // 获取音频数据
    const audioBlob = await response.blob()
    const audioUrl = URL.createObjectURL(audioBlob)
    
    // 使用Audio对象播放
    const audio = new Audio(audioUrl)
    
    return new Promise((resolve, reject) => {
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl)
        resolve()
      }
      audio.onerror = (error) => {
        URL.revokeObjectURL(audioUrl)
        reject(new Error('音频播放失败'))
      }
      audio.play().catch(reject)
    })
  } catch (error) {
    throw error instanceof Error ? error : new Error('第三方TTS调用失败')
  }
}

/**
 * 统一的TTS管理器
 * 根据配置自动选择TTS方案
 */
export class TTSManager {
  private static instance: TTSManager | null = null
  private currentAudio: HTMLAudioElement | null = null
  private browserTTS: BrowserTTS

  private constructor() {
    this.browserTTS = BrowserTTS.getInstance()
  }

  static getInstance(): TTSManager {
    if (!TTSManager.instance) {
      TTSManager.instance = new TTSManager()
    }
    return TTSManager.instance
  }

  /**
   * 播放文本（根据配置选择TTS方案）
   */
  async speak(
    text: string,
    options: TTSOptions & {
      ttsType?: TTSType
      edgeOptions?: { voice?: string; rate?: string; pitch?: string }
      thirdPartyOptions?: ThirdPartyTTSOptions
    } = {}
  ): Promise<void> {
    // 停止当前播放
    this.stop()

    const ttsType = options.ttsType || getClientTTSConfig()

    try {
      switch (ttsType) {
        case 'browser':
          options.onStart?.()
          await this.browserTTS.speak(text, options)
          options.onEnd?.()
          break

        case 'edge':
          options.onStart?.()
          await speakWithEdgeTTS(text, options.edgeOptions || {})
          options.onEnd?.()
          break

        case 'third-party':
          if (!options.thirdPartyOptions) {
            throw new Error('第三方TTS需要提供配置选项')
          }
          options.onStart?.()
          await speakWithThirdPartyTTS(text, options.thirdPartyOptions)
          options.onEnd?.()
          break

        default:
          throw new Error(`不支持的TTS类型: ${ttsType}`)
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('TTS播放失败')
      options.onError?.(err)
      throw err
    }
  }

  /**
   * 停止播放
   */
  stop(): void {
    // 停止浏览器TTS
    this.browserTTS.stop()
    
    // 停止音频播放
    if (this.currentAudio) {
      this.currentAudio.pause()
      this.currentAudio = null
    }
  }

  /**
   * 检查TTS方案是否可用
   */
  isAvailable(ttsType: TTSType): boolean {
    // 在服务端，所有TTS方案都返回true，避免水合错误
    // 实际可用性检查在客户端进行
    if (typeof window === 'undefined') {
      return true
    }
    
    switch (ttsType) {
      case 'browser':
        return this.browserTTS.isSupported()
      case 'edge':
        return true // Edge TTS通过API调用，总是可用（但可能失败）
      case 'third-party':
        return true // 第三方TTS通过API调用，总是可用（但需要配置）
      default:
        return false
    }
  }
}

/**
 * 便捷函数：使用统一TTS管理器播放文本
 */
export function speakText(
  text: string,
  options?: TTSOptions & {
    ttsType?: TTSType
    edgeOptions?: { voice?: string; rate?: string; pitch?: string }
    thirdPartyOptions?: ThirdPartyTTSOptions
  }
): Promise<void> {
  const manager = TTSManager.getInstance()
  return manager.speak(text, options || {})
}

/**
 * 便捷函数：停止播放
 */
export function stopSpeaking(): void {
  const manager = TTSManager.getInstance()
  manager.stop()
}

/**
 * 便捷函数：检查TTS方案是否可用
 */
export function isTTSAvailable(ttsType: TTSType): boolean {
  const manager = TTSManager.getInstance()
  return manager.isAvailable(ttsType)
}

