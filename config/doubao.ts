/**
 * 豆包AI配置文件
 * 
 * 获取方式：https://www.volcengine.com/product/doubao
 * 注意：豆包AI的API端点可能因地区而异，请根据实际情况调整
 */

// 豆包AI API密钥
// 优先从环境变量读取，如果没有则使用默认值
export const DOUBAO_API_KEY = process.env.DOUBAO_API_KEY || '508ec7e7-b2c5-4f38-9470-e34bf7d39f12'

// 豆包AI API端点（根据您的账号区域选择）
// 北京: https://ark.cn-beijing.volces.com/api/v3/chat/completions
// 上海: https://ark.cn-shanghai.volces.com/api/v3/chat/completions
export const DOUBAO_API_URL = process.env.DOUBAO_API_URL || 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'

// 默认模型
export const DOUBAO_MODEL = process.env.DOUBAO_MODEL || 'doubao-seed-1-6-251015'

// 豆包AI配置对象
export const doubaoConfig = {
  apiKey: DOUBAO_API_KEY,
  apiUrl: DOUBAO_API_URL,
  model: DOUBAO_MODEL,
  // 默认请求参数
  defaultParams: {
    temperature: 0.7,
    max_tokens: 200, // 限制回复长度
  },
  // 系统提示词
  systemPrompt: '你是一个直播间助手，负责回复直播间观众的问题。回复要简洁、友好、有趣，控制在50字以内。',
}

/**
 * 验证配置是否完整
 */
export function validateDoubaoConfig(): { valid: boolean; error?: string } {
  if (!DOUBAO_API_KEY) {
    return {
      valid: false,
      error: 'DOUBAO_API_KEY 未配置',
    }
  }

  if (!DOUBAO_API_URL) {
    return {
      valid: false,
      error: 'DOUBAO_API_URL 未配置',
    }
  }

  if (!DOUBAO_MODEL) {
    return {
      valid: false,
      error: 'DOUBAO_MODEL 未配置',
    }
  }

  return { valid: true }
}

