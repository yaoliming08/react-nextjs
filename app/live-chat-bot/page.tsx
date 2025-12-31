'use client'
import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import {
  parseWebSocketMessage,
  ProcessedMessage,
  getUserNickname,
  isUserEnterMessage,
  isGiftMessage,
  isDanmuMessage,
  getMessageTypeIcon,
  getMessageTypeColor,
  getMessageTypeLabel,
} from './messageHandler'
import { callDoubaoAIThroughAPI } from './aiService'

interface BarrageMessage {
  id: string
  type: ProcessedMessage['type']
  username: string
  content: string
  timestamp: Date
  giftName?: string
  giftCount?: number
  userInfo?: any
  roomInfo?: any
  processedMessage?: ProcessedMessage
}

const LiveChatBotPage = () => {
  const [messages, setMessages] = useState<BarrageMessage[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [wsUrl, setWsUrl] = useState('ws://localhost:8888')
  const [autoReply, setAutoReply] = useState(false)
  const [replyKeywords, setReplyKeywords] = useState('')
  const [replyMessage, setReplyMessage] = useState('感谢您的支持！')
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [aiEnabled, setAiEnabled] = useState(true) // 启用AI回复
  const [aiProcessing, setAiProcessing] = useState(false) // AI处理中
  const [aiReplyEnabled, setAiReplyEnabled] = useState(true) // 是否显示AI回复
  const [voiceTemplates, setVoiceTemplates] = useState({
    enter: '欢迎 {username} 进入直播间',
    gift: '{username} 送出了 {giftName}',
    danmu: '{username} 说 {content}',
    like: '{username} 点赞了',
  })
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const speechQueueRef = useRef<string[]>([])
  const isSpeakingRef = useRef(false)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // 语音播报函数
  const speak = (text: string) => {
    if (!voiceEnabled || !text) return

    // 检查浏览器是否支持语音合成
    if (!('speechSynthesis' in window)) {
      console.warn('浏览器不支持语音合成功能')
      return
    }

    // 将文本加入队列
    speechQueueRef.current.push(text)
    processSpeechQueue()
  }

  // 处理语音队列
  const processSpeechQueue = () => {
    if (isSpeakingRef.current || speechQueueRef.current.length === 0) {
      return
    }

    const text = speechQueueRef.current.shift()
    if (!text) return

    isSpeakingRef.current = true

    const utterance = new SpeechSynthesisUtterance(text)
    
    // 设置语音参数
    utterance.lang = 'zh-CN'
    utterance.rate = 1.0 // 语速 (0.1 到 10)
    utterance.pitch = 1.0 // 音调 (0 到 2)
    utterance.volume = 1.0 // 音量 (0 到 1)

    // 尝试使用中文语音
    const voices = window.speechSynthesis.getVoices()
    const chineseVoice = voices.find(voice => 
      voice.lang.includes('zh') || voice.lang.includes('CN')
    )
    if (chineseVoice) {
      utterance.voice = chineseVoice
    }

    utterance.onend = () => {
      isSpeakingRef.current = false
      // 继续处理队列中的下一个
      setTimeout(() => processSpeechQueue(), 100)
    }

    utterance.onerror = (error) => {
      console.error('语音播报错误:', error)
      isSpeakingRef.current = false
      setTimeout(() => processSpeechQueue(), 100)
    }

    window.speechSynthesis.speak(utterance)
  }

  // 初始化语音（某些浏览器需要先获取语音列表）
  useEffect(() => {
    if ('speechSynthesis' in window) {
      // 某些浏览器需要先调用一次 getVoices 才能获取完整列表
      window.speechSynthesis.getVoices()
      
      // 监听语音列表变化
      const handleVoicesChanged = () => {
        window.speechSynthesis.getVoices()
      }
      window.speechSynthesis.onvoiceschanged = handleVoicesChanged
    }
  }, [])

  // 格式化语音模板
  const formatVoiceTemplate = (template: string, data: { username: string; content?: string; giftName?: string }) => {
    let result = template
    result = result.replace(/{username}/g, data.username || '用户')
    result = result.replace(/{content}/g, data.content || '')
    result = result.replace(/{giftName}/g, data.giftName || '礼物')
    return result
  }

  const connectWebSocket = () => {
    try {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        return
      }

      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('WebSocket 连接成功')
        setIsConnected(true)
        addSystemMessage('WebSocket 连接成功')
      }

      ws.onmessage = (event) => {
        try {
          // 使用消息处理器解析消息
          const processedMessage = parseWebSocketMessage(event.data)
          
          if (processedMessage) {
            handleProcessedMessage(processedMessage)
          } else {
            // 如果解析失败，记录原始数据
            console.warn('无法解析的消息:', event.data)
            addMessage({
              type: 'unknown',
              username: '系统',
              content: `无法解析的消息: ${event.data.toString().substring(0, 100)}`,
            })
          }
        } catch (error) {
          console.error('处理消息失败:', error)
          addMessage({
            type: 'unknown',
            username: '系统',
            content: `处理消息时出错: ${error}`,
          })
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket 错误:', error)
        addSystemMessage('WebSocket 连接错误')
        setIsConnected(false)
      }

      ws.onclose = () => {
        console.log('WebSocket 连接关闭')
        setIsConnected(false)
        addSystemMessage('WebSocket 连接已断开')

        // 自动重连
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current)
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          if (wsUrl) {
            connectWebSocket()
          }
        }, 3000)
      }
    } catch (error) {
      console.error('连接 WebSocket 失败:', error)
      addSystemMessage('连接失败，请检查 WebSocket 地址')
      setIsConnected(false)
    }
  }

  /**
   * 处理解析后的消息
   */
  const handleProcessedMessage = (processedMessage: ProcessedMessage) => {
    const username = getUserNickname(processedMessage)
    
    // 构建显示消息
    const message: BarrageMessage = {
      id: `${Date.now()}-${Math.random()}`,
      type: processedMessage.type,
      username,
      content: processedMessage.content,
      timestamp: processedMessage.timestamp,
      giftName: processedMessage.giftInfo?.giftName,
      giftCount: processedMessage.giftInfo?.giftCount,
      userInfo: processedMessage.userInfo,
      roomInfo: processedMessage.roomInfo,
      processedMessage,
    }
    
    addMessage(message)

    // 根据消息类型处理
    if (isUserEnterMessage(processedMessage)) {
      // 用户进入直播间 - 语音播报
      if (voiceEnabled) {
        const voiceText = formatVoiceTemplate(voiceTemplates.enter, { username })
        speak(voiceText)
      }
    } else if (isGiftMessage(processedMessage)) {
      // 礼物消息 - 语音播报
      if (voiceEnabled) {
        const giftName = processedMessage.giftInfo?.giftName || '礼物'
        const voiceText = formatVoiceTemplate(voiceTemplates.gift, { username, giftName })
        speak(voiceText)
      }
    } else if (isDanmuMessage(processedMessage)) {
      // 弹幕消息处理
      const danmuContent = message.content.trim()
      
      // 如果启用AI回复，调用豆包AI
      if (aiEnabled && danmuContent && !aiProcessing) {
        setAiProcessing(true)
        
        // 调用AI获取回复（传递page_key以便API从数据库读取配置）
        callDoubaoAIThroughAPI(danmuContent, `用户 ${username} 在直播间说: ${danmuContent}`, 'live-chat-bot')
          .then((aiResponse) => {
            setAiProcessing(false)
            
            if (aiResponse.success && aiResponse.reply) {
              // 添加AI回复消息
              addMessage({
                type: 'danmu',
                username: 'AI助手',
                content: `@${username} ${aiResponse.reply}`,
              })
              
              // 如果启用语音，播报AI回复（可选）
              if (voiceEnabled && aiReplyEnabled) {
                speak(`AI回复: ${aiResponse.reply}`)
              }
            } else {
              console.error('AI回复失败:', aiResponse.error)
              // 可选：显示错误提示
              // addSystemMessage(`AI回复失败: ${aiResponse.error}`)
            }
          })
          .catch((error) => {
            setAiProcessing(false)
            console.error('调用AI失败:', error)
          })
      }
      
      // 原有的关键词自动回复逻辑（如果启用）
      if (autoReply && replyKeywords && message.content && !aiEnabled) {
        const keywords = replyKeywords.split(',').map(k => k.trim())
        const shouldReply = keywords.some(keyword => 
          message.content.includes(keyword)
        )
        if (shouldReply) {
          setTimeout(() => {
            addMessage({
              type: 'danmu',
              username: '自动回复',
              content: `@${message.username} ${replyMessage}`,
            })
          }, 500)
        }
      }
    }
  }

  const addMessage = (msg: Omit<BarrageMessage, 'id' | 'timestamp'>) => {
    const message: BarrageMessage = {
      ...msg,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, message])
  }

  const addSystemMessage = (content: string) => {
    addMessage({
      type: 'system',
      username: '系统',
      content,
    })
  }

  const disconnectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    setIsConnected(false)
    addSystemMessage('已断开连接')
  }

  useEffect(() => {
    return () => {
      disconnectWebSocket()
    }
  }, [])

  const clearMessages = () => {
    setMessages([])
  }

  // 直接使用 messageHandler 中导入的工具函数

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 flex flex-col">
      {/* 顶部导航栏 */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <Link href="/" className="flex items-center text-gray-600 hover:text-gray-900 transition-colors">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              返回首页
            </Link>
            <h1 className="text-xl font-semibold text-gray-800">直播间回复机器人</h1>
            <div className="w-24"></div>
          </div>

          {/* 连接控制 */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">WebSocket 地址:</label>
              <input
                type="text"
                value={wsUrl}
                onChange={(e) => setWsUrl(e.target.value)}
                disabled={isConnected}
                className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100"
                placeholder="ws://localhost:8888"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-600">{isConnected ? '已连接' : '未连接'}</span>
            </div>
            {!isConnected ? (
              <button
                onClick={connectWebSocket}
                className="px-4 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-sm transition-colors"
              >
                连接
              </button>
            ) : (
              <button
                onClick={disconnectWebSocket}
                className="px-4 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm transition-colors"
              >
                断开
              </button>
            )}
            <button
              onClick={clearMessages}
              className="px-4 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm transition-colors"
            >
              清空消息
            </button>
          </div>

          {/* 语音播报设置 */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-4 flex-wrap mb-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={voiceEnabled}
                  onChange={(e) => {
                    setVoiceEnabled(e.target.checked)
                    if (!e.target.checked) {
                      // 停止当前播放
                      window.speechSynthesis.cancel()
                      speechQueueRef.current = []
                      isSpeakingRef.current = false
                    }
                  }}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700 font-medium">启用语音播报</span>
              </label>
              <button
                onClick={() => {
                  window.speechSynthesis.cancel()
                  speechQueueRef.current = []
                  isSpeakingRef.current = false
                }}
                className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm transition-colors"
              >
                停止播报
              </button>
              <button
                onClick={() => {
                  if (voiceEnabled) {
                    speak('欢迎测试用户进入直播间')
                  }
                }}
                className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition-colors"
              >
                测试语音
              </button>
            </div>
            {voiceEnabled && (
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <label className="text-gray-600 w-24">进入直播间:</label>
                  <input
                    type="text"
                    value={voiceTemplates.enter}
                    onChange={(e) => setVoiceTemplates({ ...voiceTemplates, enter: e.target.value })}
                    className="px-2 py-1 border border-gray-300 rounded flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="欢迎 {username} 进入直播间"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-gray-600 w-24">礼物消息:</label>
                  <input
                    type="text"
                    value={voiceTemplates.gift}
                    onChange={(e) => setVoiceTemplates({ ...voiceTemplates, gift: e.target.value })}
                    className="px-2 py-1 border border-gray-300 rounded flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="{username} 送出了 {giftName}"
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  提示: 使用 {'{username}'} 表示用户名, {'{giftName}'} 表示礼物名称, {'{content}'} 表示消息内容
                </div>
              </div>
            )}
          </div>

          {/* AI回复设置 */}
          <div className="mt-4 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
            <div className="flex items-center gap-4 flex-wrap mb-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={aiEnabled}
                  onChange={(e) => setAiEnabled(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700 font-medium">启用AI智能回复（豆包AI）</span>
              </label>
              {aiProcessing && (
                <span className="text-sm text-purple-600 flex items-center gap-1">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  AI处理中...
                </span>
              )}
            </div>
            {aiEnabled && (
              <div className="mt-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={aiReplyEnabled}
                    onChange={(e) => setAiReplyEnabled(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-gray-600">语音播报AI回复</span>
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  当用户发送弹幕时，AI会自动生成回复。请确保已在环境变量中配置 DOUBAO_API_KEY。
                </p>
              </div>
            )}
          </div>

          {/* 关键词自动回复设置（备用） */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={autoReply}
                  onChange={(e) => setAutoReply(e.target.checked)}
                  disabled={aiEnabled}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">启用关键词自动回复（AI关闭时使用）</span>
              </label>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">关键词 (逗号分隔):</label>
                <input
                  type="text"
                  value={replyKeywords}
                  onChange={(e) => setReplyKeywords(e.target.value)}
                  disabled={!autoReply || aiEnabled}
                  className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100"
                  placeholder="你好,谢谢,支持"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">回复内容:</label>
                <input
                  type="text"
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  disabled={!autoReply || aiEnabled}
                  className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100 flex-1"
                  placeholder="感谢您的支持！"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 消息区域 */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-6xl mx-auto space-y-3">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-20">
              <p className="text-lg">暂无消息</p>
              <p className="text-sm mt-2">请连接 WebSocket 开始接收直播间消息</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`border-l-4 rounded-r-lg p-3 ${getMessageTypeColor(message.type)}`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-lg">{getMessageTypeIcon(message.type)}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{message.username}</span>
                      <span className="text-xs opacity-70">
                        {message.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                      {message.giftCount && (
                        <span className="text-xs bg-yellow-200 px-2 py-0.5 rounded">x{message.giftCount}</span>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed">{message.content}</p>
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  )
}

export default LiveChatBotPage

