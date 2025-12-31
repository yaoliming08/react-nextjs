'use client'
import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import {
  parseWebSocketMessage,
  ProcessedMessage,
  getUserNickname,
  isDanmuMessage,
} from './messageHandler'
import { callDoubaoAIThroughAPI } from './aiService'
import { speakText, stopSpeaking, isTTSAvailable } from '../lib/tts'
import type { TTSType } from '@/config/tts'

interface AIReplyMessage {
  id: string
  text: string
  timestamp: Date
  username?: string // 触发AI回复的用户名
}

const LiveChatBotPage = () => {
  const [aiReplies, setAiReplies] = useState<AIReplyMessage[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
  
  // 配置状态（从数据库读取）
  const [ttsType, setTtsType] = useState<TTSType>('browser')
  const [autoPlayVoice, setAutoPlayVoice] = useState(true)
  const [aiEnabled, setAiEnabled] = useState(true)
  const [wsUrl, setWsUrl] = useState('ws://localhost:8888')
  
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const isMounted = useRef(false)

  // 从数据库读取配置
  useEffect(() => {
    isMounted.current = true
    
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/chat-config?page_key=live-chat-bot')
        const result = await response.json()
        
        if (result.success && result.data) {
          const config = result.data.config_data
          
          // 设置TTS配置
          if (config.tts) {
            if (config.tts.type) {
              setTtsType(config.tts.type)
            }
            if (config.tts.autoPlay !== undefined) {
              setAutoPlayVoice(config.tts.autoPlay)
            }
          }
          
          // 设置AI配置
          if (config.ai) {
            if (config.ai.enabled !== undefined) {
              setAiEnabled(config.ai.enabled)
            }
          }
          
          // 设置WebSocket URL（如果有配置）
          if (config.wsUrl) {
            setWsUrl(config.wsUrl)
          }
        }
      } catch (error) {
        console.error('获取配置失败:', error)
      }
    }
    
    fetchConfig()
  }, [])

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [aiReplies])

  // 连接WebSocket
  const connectWebSocket = () => {
    try {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        return
      }

      setConnectionStatus('connecting')
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('WebSocket 连接成功')
        setIsConnected(true)
        setConnectionStatus('connected')
      }

      ws.onmessage = (event) => {
        try {
          const processedMessage = parseWebSocketMessage(event.data)
          
          if (processedMessage && isDanmuMessage(processedMessage)) {
            // 只处理弹幕消息
            const danmuContent = processedMessage.content?.trim()
            const username = getUserNickname(processedMessage)
            
            if (danmuContent && aiEnabled && !isProcessing) {
              handleDanmuMessage(danmuContent, username)
            }
          }
        } catch (error) {
          console.error('处理消息失败:', error)
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket 连接错误:', error)
        setIsConnected(false)
        setConnectionStatus('disconnected')
        // 不在这里重连，让onclose处理重连逻辑
      }

      ws.onclose = () => {
        console.log('WebSocket 连接关闭')
        setIsConnected(false)
        setConnectionStatus('disconnected')
        
        // 自动重连
        if (isMounted.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMounted.current) {
              connectWebSocket()
            }
          }, 3000)
        }
      }
    } catch (error) {
      console.error('连接WebSocket失败:', error)
      setConnectionStatus('disconnected')
      // 3秒后自动重试
      if (isMounted.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          if (isMounted.current) {
            connectWebSocket()
          }
        }, 3000)
      }
    }
  }

  // 断开WebSocket
  const disconnectWebSocket = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    
    setIsConnected(false)
    setConnectionStatus('disconnected')
  }

  // 处理弹幕消息，调用AI并显示回复
  const handleDanmuMessage = async (danmuContent: string, username: string) => {
    if (isProcessing) return
    
    setIsProcessing(true)
    
    try {
      const aiResponse = await callDoubaoAIThroughAPI(
        danmuContent,
        `用户 ${username} 在直播间说: ${danmuContent}`,
        'live-chat-bot'
      )
      
      if (aiResponse.success && aiResponse.reply) {
        const replyMessage: AIReplyMessage = {
          id: `reply-${Date.now()}-${Math.random()}`,
          text: aiResponse.reply,
          timestamp: new Date(),
          username: username,
        }
        
        setAiReplies(prev => [...prev, replyMessage])
        
        // 只播放最后一条消息的语音
        if (autoPlayVoice && isTTSAvailable(ttsType)) {
          // 停止之前的播放
          stopSpeaking()
          
          // 延迟一点播放，让消息先显示
          setTimeout(() => {
            speakText(aiResponse.reply!, {
              ttsType,
              edgeOptions: ttsType === 'edge' ? {
                voice: 'zh-CN-XiaoxiaoNeural',
                rate: '+0%',
                pitch: '+0Hz',
              } : undefined,
              thirdPartyOptions: ttsType === 'third-party' ? {
                provider: 'baidu',
              } : undefined,
              onStart: () => {
                // 可以添加播放状态指示
              },
              onEnd: () => {
                // 播放完成
              },
              onError: (error) => {
                console.error('语音播放失败:', error)
              }
            }).catch(() => {
              // 忽略播放错误
            })
          }, 300)
        }
      }
    } catch (error) {
      console.error('调用AI失败:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  // 组件挂载时连接WebSocket
  useEffect(() => {
    if (isMounted.current) {
      connectWebSocket()
    }
    
    return () => {
      isMounted.current = false
      disconnectWebSocket()
      stopSpeaking()
    }
  }, [wsUrl, aiEnabled])

  // 获取连接状态文本
  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return '已连接'
      case 'connecting':
        return '连接中...'
      default:
        return '未连接'
    }
  }

  // 获取连接状态颜色
  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'bg-green-500'
      case 'connecting':
        return 'bg-yellow-500'
      default:
        return 'bg-gray-400'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex flex-col">
      {/* 顶部导航栏 */}
      <div className="bg-black/30 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center text-white/80 hover:text-white transition-colors">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            返回首页
          </Link>
          <h1 className="text-xl font-semibold text-white">直播间AI回复机器人</h1>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${getStatusColor()} animate-pulse`}></div>
              <span className="text-sm text-white/80">{getStatusText()}</span>
            </div>
            {isProcessing && (
              <div className="flex items-center space-x-1 text-white/60">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-xs">AI思考中...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI回复消息区域 */}
      <div className="flex-1 overflow-y-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {aiReplies.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-white/40">
              <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-lg">等待直播间消息...</p>
              <p className="text-sm mt-2">AI回复将显示在这里</p>
            </div>
          ) : (
            aiReplies.map((reply, index) => (
              <div
                key={reply.id}
                className={`animate-fade-in-up ${
                  index === aiReplies.length - 1 ? 'animate-scale-in' : ''
                }`}
                style={{
                  animationDelay: `${index * 0.1}s`,
                }}
              >
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-2xl transform transition-all duration-500 hover:scale-[1.02] hover:bg-white/15">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center shadow-lg">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      {reply.username && (
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-xs text-white/60">回复</span>
                          <span className="text-sm font-medium text-white/80">{reply.username}</span>
                        </div>
                      )}
                      <p className="text-white text-lg leading-relaxed whitespace-pre-wrap">
                        {reply.text}
                      </p>
                      <p className="text-xs text-white/40 mt-3">
                        {reply.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 底部状态栏 */}
      <div className="bg-black/30 backdrop-blur-sm border-t border-white/10 py-3">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between text-sm text-white/60">
          <div className="flex items-center space-x-4">
            <span>AI回复数: {aiReplies.length}</span>
            {autoPlayVoice && (
              <span className="flex items-center space-x-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.383 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.383l4-4.617a1 1 0 011.617-.307zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                </svg>
                <span>语音播放已启用</span>
              </span>
            )}
          </div>
          <div className="text-xs">
            TTS方案: {ttsType === 'browser' ? '浏览器' : ttsType === 'edge' ? 'Edge' : '第三方'}
          </div>
        </div>
      </div>
    </div>
  )
}

export default LiveChatBotPage
