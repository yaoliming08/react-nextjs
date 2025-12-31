import { NextRequest, NextResponse } from 'next/server'

/**
 * 第三方TTS服务API路由
 * 支持：百度、阿里云、腾讯云
 * 
 * 注意：需要在环境变量中配置相应的API密钥
 */

interface ThirdPartyTTSRequest {
  text: string
  provider: 'baidu' | 'aliyun' | 'tencent'
  voice?: string
  speed?: number
  pitch?: number
}

/**
 * 百度TTS
 */
async function baiduTTS(text: string, voice: string = 'zh', speed: number = 5, pitch: number = 5): Promise<ArrayBuffer> {
  const apiKey = process.env.BAIDU_TTS_API_KEY
  const secretKey = process.env.BAIDU_TTS_SECRET_KEY
  
  if (!apiKey || !secretKey) {
    throw new Error('百度TTS API密钥未配置，请设置 BAIDU_TTS_API_KEY 和 BAIDU_TTS_SECRET_KEY')
  }
  
  // 百度TTS需要先获取access_token
  const tokenUrl = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`
  const tokenResponse = await fetch(tokenUrl, { method: 'POST' })
  const tokenData = await tokenResponse.json()
  
  if (!tokenData.access_token) {
    throw new Error('获取百度TTS access_token失败')
  }
  
  // 调用TTS API
  const ttsUrl = `https://tsn.baidu.com/text2audio?tex=${encodeURIComponent(text)}&tok=${tokenData.access_token}&cuid=web&ctp=1&lan=zh&per=${voice}&spd=${speed}&pit=${pitch}&vol=5`
  
  const response = await fetch(ttsUrl)
  if (!response.ok) {
    throw new Error(`百度TTS请求失败: ${response.status}`)
  }
  
  return await response.arrayBuffer()
}

/**
 * 阿里云TTS
 */
async function aliyunTTS(text: string, voice: string = 'xiaoyun', speed: number = 0, pitch: number = 0): Promise<ArrayBuffer> {
  const accessKeyId = process.env.ALIYUN_TTS_ACCESS_KEY_ID
  const accessKeySecret = process.env.ALIYUN_TTS_ACCESS_KEY_SECRET
  const appKey = process.env.ALIYUN_TTS_APP_KEY
  
  if (!accessKeyId || !accessKeySecret || !appKey) {
    throw new Error('阿里云TTS配置未完整，请设置 ALIYUN_TTS_ACCESS_KEY_ID, ALIYUN_TTS_ACCESS_KEY_SECRET, ALIYUN_TTS_APP_KEY')
  }
  
  // 阿里云TTS需要签名和复杂的请求构建
  // 这里提供简化示例，实际使用时需要安装 @alicloud/nls-sdk 或类似SDK
  // 参考：https://help.aliyun.com/document_detail/84430.html
  
  throw new Error('阿里云TTS需要安装SDK，请参考文档实现')
}

/**
 * 腾讯云TTS
 */
async function tencentTTS(text: string, voice: string = 'zh_female_shuangkuaisisi_moon_bigtts', speed: number = 0, pitch: number = 0): Promise<ArrayBuffer> {
  const secretId = process.env.TENCENT_TTS_SECRET_ID
  const secretKey = process.env.TENCENT_TTS_SECRET_KEY
  
  if (!secretId || !secretKey) {
    throw new Error('腾讯云TTS配置未完整，请设置 TENCENT_TTS_SECRET_ID 和 TENCENT_TTS_SECRET_KEY')
  }
  
  // 腾讯云TTS需要签名和复杂的请求构建
  // 这里提供简化示例，实际使用时需要安装 tencentcloud-sdk-nodejs
  // 参考：https://cloud.tencent.com/document/product/1073
  
  throw new Error('腾讯云TTS需要安装SDK，请参考文档实现')
}

export async function POST(request: NextRequest) {
  try {
    const body: ThirdPartyTTSRequest = await request.json()
    const { text, provider, voice, speed = 5, pitch = 5 } = body

    if (!text || !text.trim()) {
      return NextResponse.json(
        { success: false, error: '文本内容不能为空' },
        { status: 400 }
      )
    }

    if (!provider || !['baidu', 'aliyun', 'tencent'].includes(provider)) {
      return NextResponse.json(
        { success: false, error: '不支持的TTS提供商' },
        { status: 400 }
      )
    }

    let audioBuffer: ArrayBuffer

    try {
      switch (provider) {
        case 'baidu':
          audioBuffer = await baiduTTS(text, voice, speed, pitch)
          break
        case 'aliyun':
          audioBuffer = await aliyunTTS(text, voice, speed, pitch)
          break
        case 'tencent':
          audioBuffer = await tencentTTS(text, voice, speed, pitch)
          break
        default:
          throw new Error('不支持的TTS提供商')
      }

      return new NextResponse(audioBuffer, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Disposition': `attachment; filename="tts-${Date.now()}.mp3"`,
        },
      })
    } catch (error) {
      console.error(`${provider} TTS错误:`, error)
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'TTS服务调用失败',
          provider,
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('处理第三方TTS请求失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    )
  }
}

