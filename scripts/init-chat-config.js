/**
 * 初始化聊天配置表的脚本
 * 使用方法：node scripts/init-chat-config.js
 */

const mysql = require('mysql2/promise')

const dbConfig = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '199808',
  database: 'xl',
}

async function initTable() {
  let connection
  try {
    // 连接数据库
    connection = await mysql.createConnection(dbConfig)
    console.log('✅ 数据库连接成功')

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
    await connection.execute(createTableSQL)
    console.log('✅ 表创建成功（如果已存在则跳过）')

    // 检查是否已有配置
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM chat_config')
    const count = rows[0].count

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
        await connection.execute(
          'INSERT INTO chat_config (page_key, page_name, config_data, description, is_active) VALUES (?, ?, ?, ?, ?)',
          config
        )
      }
      console.log('✅ 默认配置插入成功')
    } else {
      console.log(`ℹ️  表中已有 ${count} 条配置，跳过插入默认配置`)
    }

    console.log('✅ 初始化完成！')
  } catch (error) {
    console.error('❌ 初始化失败:', error.message)
    process.exit(1)
  } finally {
    if (connection) {
      await connection.end()
    }
  }
}

// 执行初始化
initTable()

