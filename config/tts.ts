/**
 * TTS（文本转语音）配置文件
 * 支持三种方案：浏览器原生API、Edge TTS、第三方TTS服务
 */

export type TTSType = 'browser' | 'edge' | 'third-party'

export interface TTSConfig {
  // TTS方案类型
  type: TTSType
  
  // Edge TTS配置
  edge?: {
    voice?: string // 语音名称，默认 'zh-CN-XiaoxiaoNeural'
    rate?: string // 语速，默认 '+0%'
    pitch?: string // 音调，默认 '+0Hz'
  }
  
  // 第三方TTS配置
  thirdParty?: {
    provider: 'baidu' | 'aliyun' | 'tencent'
    // API密钥等配置通过环境变量设置，不在这里暴露
  }
}

// 默认配置：使用浏览器原生API
export const defaultTTSConfig: TTSConfig = {
  type: 'browser',
}

// 从环境变量读取配置
export const ttsConfig: TTSConfig = (() => {
  const type = (process.env.TTS_TYPE as TTSType) || 'browser'
  
  const config: TTSConfig = {
    type,
  }
  
  if (type === 'edge') {
    config.edge = {
      voice: process.env.EDGE_TTS_VOICE || 'zh-CN-XiaoxiaoNeural',
      rate: process.env.EDGE_TTS_RATE || '+0%',
      pitch: process.env.EDGE_TTS_PITCH || '+0Hz',
    }
  }
  
  if (type === 'third-party') {
    config.thirdParty = {
      provider: (process.env.TTS_PROVIDER as 'baidu' | 'aliyun' | 'tencent') || 'baidu',
    }
  }
  
  return config
})()

/**
 * 可用的Edge TTS语音列表（中文）
 */
export const edgeTTSVoices = {
  // 女声
  'zh-CN-XiaoxiaoNeural': '晓晓（女声，自然）',
  'zh-CN-XiaoyiNeural': '晓伊（女声，温柔）',
  'zh-CN-XiaohanNeural': '晓涵（女声，活泼）',
  'zh-CN-XiaomoNeural': '晓墨（女声，成熟）',
  'zh-CN-XiaoxuanNeural': '晓萱（女声，甜美）',
  'zh-CN-XiaoruiNeural': '晓睿（女声，知性）',
  'zh-CN-XiaoshuangNeural': '晓双（女声，清新）',
  'zh-CN-XiaoyanNeural': '晓颜（女声，优雅）',
  'zh-CN-XiaoyouNeural': '晓悠（女声，亲切）',
  
  // 男声
  'zh-CN-YunxiNeural': '云希（男声，自然）',
  'zh-CN-YunyangNeural': '云扬（男声，沉稳）',
  'zh-CN-YunyeNeural': '云野（男声，磁性）',
  'zh-CN-YunfengNeural': '云枫（男声，温和）',
  'zh-CN-YunhaoNeural': '云皓（男声，专业）',
  'zh-CN-YunjianNeural': '云健（男声，活力）',
}

