/**
 * 豆包AI服务
 * 用于处理直播间消息的AI回复
 */

export interface DoubaoAIResponse {
  success: boolean
  reply?: string
  error?: string
}

export interface DoubaoAIConfig {
  apiKey: string
  apiUrl?: string
  model?: string
}

/**
 * 调用豆包AI API
 * 注意：由于豆包AI的API可能需要在服务端调用（避免暴露API密钥），
 * 这里提供一个客户端调用的示例，实际使用时建议通过Next.js API路由转发
 */
export async function callDoubaoAI(
  userMessage: string,
  config: DoubaoAIConfig
): Promise<DoubaoAIResponse> {
  try {
    // 豆包AI的API端点（需要根据实际API文档调整）
    const apiUrl = config.apiUrl || 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'
    const model = config.model || 'ep-20241201201626-abcde' // 默认模型，需要替换为实际模型ID

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: '你是一个直播间助手，负责回复直播间观众的问题。回复要简洁、友好、有趣。',
          },
          {
            role: 'user',
            content: userMessage,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      return {
        success: false,
        error: errorData.error?.message || `API请求失败: ${response.status}`,
      }
    }

    const data = await response.json()
    
    // 解析豆包AI的响应格式
    const reply = data.choices?.[0]?.message?.content || data.reply || '抱歉，我没有理解您的问题。'
    
    return {
      success: true,
      reply,
    }
  } catch (error) {
    console.error('调用豆包AI失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    }
  }
}

/**
 * 通过Next.js API路由调用豆包AI（推荐方式，更安全）
 * 这样可以避免在客户端暴露API密钥
 */
export async function callDoubaoAIThroughAPI(
  userMessage: string,
  context?: string,
  page_key?: string
): Promise<DoubaoAIResponse> {
  try {
    const response = await fetch('/api/doubao-ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: userMessage,
        context: context || '直播间消息',
        page_key: page_key || 'chat',
      }),
    })

    if (!response.ok) {
      return {
        success: false,
        error: `请求失败: ${response.status}`,
      }
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('调用AI API失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    }
  }
}


