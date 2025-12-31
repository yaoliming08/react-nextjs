import { NextRequest, NextResponse } from 'next/server'
import { doubaoConfig, validateDoubaoConfig } from '@/config/doubao'

/**
 * 豆包AI API路由
 * 在服务端调用豆包AI，避免在客户端暴露API密钥
 * 
 * 获取方式：https://www.volcengine.com/product/doubao
 * 注意：豆包AI的API端点可能因地区而异，请根据实际情况调整
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, context } = body

    if (!message) {
      return NextResponse.json(
        { success: false, error: '消息内容不能为空' },
        { status: 400 }
      )
    }

    // 验证配置
    const configValidation = validateDoubaoConfig()
    if (!configValidation.valid) {
      console.error('豆包AI配置错误:', configValidation.error)
      return NextResponse.json(
        { success: false, error: configValidation.error || 'AI服务未配置' },
        { status: 500 }
      )
    }

    // 使用配置文件中的配置
    const { apiKey, apiUrl, model } = doubaoConfig

    // 调用豆包AI API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: doubaoConfig.systemPrompt,
          },
          {
            role: 'user',
            content: message,
          },
        ],
        temperature: doubaoConfig.defaultParams.temperature,
        max_tokens: doubaoConfig.defaultParams.max_tokens,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      console.error('豆包AI API错误:', errorData)
      return NextResponse.json(
        {
          success: false,
          error: errorData.error?.message || `API请求失败: ${response.status}`,
        },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    // 解析豆包AI的响应格式
    const reply = data.choices?.[0]?.message?.content || data.reply || '抱歉，我没有理解您的问题。'
    
    return NextResponse.json({
      success: true,
      reply: reply.trim(),
    })
  } catch (error) {
    console.error('处理AI请求失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    )
  }
}


