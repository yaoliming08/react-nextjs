-- 聊天配置表
-- 用于存储不同聊天页面的配置信息

CREATE TABLE IF NOT EXISTS `chat_config` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '配置ID',
  `page_key` VARCHAR(100) NOT NULL UNIQUE COMMENT '页面标识（如：chat, live-chat-bot等）',
  `page_name` VARCHAR(200) NOT NULL COMMENT '页面名称',
  `config_data` JSON NOT NULL COMMENT '配置数据（JSON格式）',
  `is_active` TINYINT(1) DEFAULT 1 COMMENT '是否启用（1-启用，0-禁用）',
  `description` TEXT COMMENT '配置描述',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_page_key` (`page_key`),
  INDEX `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='聊天配置表';

-- 插入默认配置示例
INSERT INTO `chat_config` (`page_key`, `page_name`, `config_data`, `description`) VALUES
('chat', '机器人聊天页面', 
  JSON_OBJECT(
    'tts', JSON_OBJECT(
      'type', 'browser',
      'autoPlay', true,
      'edgeOptions', JSON_OBJECT(
        'voice', 'zh-CN-XiaoxiaoNeural',
        'rate', '+0%',
        'pitch', '+0Hz'
      ),
      'thirdPartyOptions', JSON_OBJECT(
        'provider', 'baidu'
      )
    ),
    'ai', JSON_OBJECT(
      'model', 'doubao-seed-1-6-251015',
      'temperature', 0.7,
      'maxTokens', 200,
      'systemPrompt', '你是一个直播间助手，负责回复直播间观众的问题。回复要简洁、友好、有趣，控制在50字以内。'
    )
  ),
  '默认聊天页面配置'
),
('live-chat-bot', '直播间聊天机器人', 
  JSON_OBJECT(
    'tts', JSON_OBJECT(
      'type', 'browser',
      'autoPlay', true,
      'voiceEnabled', true
    ),
    'ai', JSON_OBJECT(
      'enabled', true,
      'model', 'doubao-seed-1-6-251015',
      'temperature', 0.7,
      'maxTokens', 200
    ),
    'autoReply', JSON_OBJECT(
      'enabled', false,
      'keywords', '',
      'message', '感谢您的支持！'
    )
  ),
  '直播间聊天机器人配置'
);

