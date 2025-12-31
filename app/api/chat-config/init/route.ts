import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

/**
 * 初始化聊天配置表
 * 用于自动创建数据库表（如果不存在）
 */
export async function POST(request: NextRequest) {
  try {
    // 创建表的SQL
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS \`chat_config\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY COMMENT '配置ID',
        \`page_key\` VARCHAR(100) NOT NULL UNIQUE COMMENT '页面标识（如：chat, live-chat-bot等）',
        \`page_name\` VARCHAR(200) NOT NULL COMMENT '页面名称',
        \`config_data\` JSON NOT NULL COMMENT '配置数据（JSON格式）',
        \`is_active\` TINYINT(1) DEFAULT 1 COMMENT '是否启用（1-启用，0-禁用）',
        \`description\` TEXT COMMENT '配置描述',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        INDEX \`idx_page_key\` (\`page_key\`),
        INDEX \`idx_is_active\` (\`is_active\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='聊天配置表';
    `

    // 执行创建表
    await query(createTableSQL)

    // 检查是否已有默认配置
    const existingConfigs = await query('SELECT COUNT(*) as count FROM chat_config') as any[]
    const count = existingConfigs[0]?.count || 0

    // 如果没有配置，插入默认配置
    if (count === 0) {
      const defaultConfigs = [
        [
          'chat',
          '机器人聊天页面',
          JSON.stringify({
            tts: {
              type: 'browser',
              autoPlay: true,
              edgeOptions: {
                voice: 'zh-CN-XiaoxiaoNeural',
                rate: '+0%',
                pitch: '+0Hz',
              },
              thirdPartyOptions: {
                provider: 'baidu',
              },
            },
            ai: {
              model: 'doubao-seed-1-6-251015',
              temperature: 0.7,
              maxTokens: 200,
              systemPrompt: '你是一个直播间助手，负责回复直播间观众的问题。回复要简洁、友好、有趣，控制在50字以内。',
            },
          }),
          '默认聊天页面配置',
          1,
        ],
        [
          'live-chat-bot',
          '直播间聊天机器人',
          JSON.stringify({
            tts: {
              type: 'browser',
              autoPlay: true,
              voiceEnabled: true,
            },
            ai: {
              enabled: true,
              model: 'doubao-seed-1-6-251015',
              temperature: 0.7,
              maxTokens: 200,
            },
            autoReply: {
              enabled: false,
              keywords: '',
              message: '感谢您的支持！',
            },
          }),
          '直播间聊天机器人配置',
          1,
        ],
      ]

      for (const config of defaultConfigs) {
        await query(
          'INSERT INTO chat_config (page_key, page_name, config_data, description, is_active) VALUES (?, ?, ?, ?, ?)',
          config
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: '数据库表初始化成功',
      tableCreated: true,
      defaultConfigsInserted: count === 0,
    })
  } catch (error) {
    console.error('初始化数据库表失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '初始化失败',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

