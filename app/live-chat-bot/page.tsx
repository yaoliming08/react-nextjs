'use client'
import React, { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  parseWebSocketMessage,
  getUserNickname,
  isDanmuMessage,
} from './messageHandler'
import { callDoubaoAIThroughAPI } from './aiService'
import { speakText, stopSpeaking, isTTSAvailable } from '../lib/tts'
import type { TTSType } from '@/config/tts'

interface QueuedMessage {
  id: string
  text: string
  username?: string
  timestamp: Date
}

const LiveChatBotPage = () => {
  // 消息队列（最多10条）
  const [messageQueue, setMessageQueue] = useState<QueuedMessage[]>([])
  
  // 当前显示的消息（打字机效果）
  const [currentMessage, setCurrentMessage] = useState<QueuedMessage | null>(null)
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  
  // WebSocket 状态
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
  const isMounted = useRef(false)
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isProcessingRef = useRef(false) // 用于防止重复处理

  // 从数据库读取配置
  useEffect(() => {
    isMounted.current = true
    
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/chat-config?page_key=live-chat-bot')
        const result = await response.json()
        
        if (result.success && result.data) {
          const config = result.data.config_data
          
          if (config.tts) {
            if (config.tts.type) setTtsType(config.tts.type)
            if (config.tts.autoPlay !== undefined) setAutoPlayVoice(config.tts.autoPlay)
          }
          
          if (config.ai) {
            if (config.ai.enabled !== undefined) setAiEnabled(config.ai.enabled)
          }
          
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

  // 打字机效果
  const startTypingEffect = useCallback((text: string) => {
    setIsTyping(true)
    setDisplayedText('')
    
    let index = 0
    const typingSpeed = 50 // 每个字符的延迟（毫秒）
    
    const type = () => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1))
        index++
        typingIntervalRef.current = setTimeout(type, typingSpeed)
      } else {
        setIsTyping(false)
      }
    }
    
    type()
  }, [])

  // 停止打字机效果
  const stopTypingEffect = useCallback(() => {
    if (typingIntervalRef.current) {
      clearTimeout(typingIntervalRef.current)
      typingIntervalRef.current = null
    }
    setIsTyping(false)
  }, [])

  // 处理队列中的下一条消息
  const processNextMessage = useCallback(async () => {
    // 如果正在处理，直接返回
    if (isProcessingRef.current) {
      return
    }
    
    // 使用函数式更新来检查队列并处理消息
    setMessageQueue(prev => {
      // 如果队列为空，直接返回
      if (prev.length === 0) {
        return prev
      }
      
      // 从队列中取出第一条消息
      const nextMessage = prev[0]
      
      // 标记为正在处理
      isProcessingRef.current = true
      
      // 设置当前消息并开始打字机效果
      setCurrentMessage(nextMessage)
      startTypingEffect(nextMessage.text)
      
      // 计算打字机效果完成时间
      const typingDuration = nextMessage.text.length * 50 + 300 // 打字时间 + 缓冲
      
      // 等待打字机效果完成后再播放语音
      setTimeout(async () => {
        if (!isMounted.current) return
        
        // 如果启用自动播放，播放语音
        if (autoPlayVoice && isTTSAvailable(ttsType)) {
          setIsSpeaking(true)
          
          try {
            await speakText(nextMessage.text, {
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
                setIsSpeaking(true)
              },
              onEnd: () => {
                setIsSpeaking(false)
                // 语音播放完成后，处理下一条消息
                isProcessingRef.current = false
                setTimeout(() => {
                  if (isMounted.current) {
                    processNextMessage()
                  }
                }, 500) // 短暂延迟后再处理下一条
              },
              onError: (error) => {
                console.error('语音播放失败:', error)
                setIsSpeaking(false)
                // 即使播放失败，也继续处理下一条
                isProcessingRef.current = false
                setTimeout(() => {
                  if (isMounted.current) {
                    processNextMessage()
                  }
                }, 500)
              }
            })
          } catch (error) {
            console.error('语音播放异常:', error)
            setIsSpeaking(false)
            isProcessingRef.current = false
            setTimeout(() => {
              if (isMounted.current) {
                processNextMessage()
              }
            }, 500)
          }
        } else {
          // 如果不播放语音，等待一段时间后处理下一条
          setIsSpeaking(false)
          isProcessingRef.current = false
          setTimeout(() => {
            if (isMounted.current) {
              processNextMessage()
            }
          }, 2000) // 不播放语音时，等待2秒再处理下一条
        }
      }, typingDuration)
      
      // 返回更新后的队列（移除第一条）
      return prev.slice(1)
    })
  }, [autoPlayVoice, ttsType, startTypingEffect])

  // 当队列变化且当前没有处理消息时，开始处理
  useEffect(() => {
    if (messageQueue.length > 0 && !isProcessingRef.current && !currentMessage && !isTyping && !isSpeaking) {
      processNextMessage()
    }
  }, [messageQueue.length, currentMessage, isTyping, isSpeaking, processNextMessage])

  // 当当前消息处理完成且队列为空时，清空当前消息
  useEffect(() => {
    if (messageQueue.length === 0 && !isProcessingRef.current && !isSpeaking && !isTyping) {
      // 延迟清空，让用户看到最后一条消息
      const timer = setTimeout(() => {
        if (isMounted.current) {
          setCurrentMessage(null)
          setDisplayedText('')
        }
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [messageQueue.length, isProcessingRef.current, isSpeaking, isTyping])

  // 处理弹幕消息，调用AI并加入队列
  const handleDanmuMessage = useCallback(async (danmuContent: string, username: string) => {
    if (!aiEnabled) return
    
    setIsProcessing(true)
    
    try {
      const aiResponse = await callDoubaoAIThroughAPI(
        danmuContent,
        `用户 ${username} 在直播间说: ${danmuContent}`,
        'live-chat-bot'
      )
      
      if (aiResponse.success && aiResponse.reply) {
        const newMessage: QueuedMessage = {
          id: `msg-${Date.now()}-${Math.random()}`,
          text: aiResponse.reply,
          username: username,
          timestamp: new Date(),
        }
        
        // 添加到队列（最多10条）
        setMessageQueue(prev => {
          const newQueue = [...prev, newMessage]
          return newQueue.slice(-10) // 只保留最后10条
        })
      }
    } catch (error) {
      console.error('调用AI失败:', error)
    } finally {
      setIsProcessing(false)
    }
  }, [aiEnabled])

  // 连接WebSocket
  const connectWebSocket = useCallback(() => {
    // 如果已经连接或正在连接，直接返回
    if (wsRef.current?.readyState === WebSocket.OPEN || 
        wsRef.current?.readyState === WebSocket.CONNECTING) {
      return
    }

    setConnectionStatus('connecting')
    console.log(`尝试连接WebSocket: ${wsUrl}`)

    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('WebSocket 连接成功')
        if (isMounted.current) {
          setIsConnected(true)
          setConnectionStatus('connected')
        }
      }

      ws.onmessage = (event) => {
        try {
          const processedMessage = parseWebSocketMessage(event.data)
          
          if (processedMessage && isDanmuMessage(processedMessage)) {
            const danmuContent = processedMessage.content?.trim()
            const username = getUserNickname(processedMessage)
            
            if (danmuContent && aiEnabled) {
              handleDanmuMessage(danmuContent, username)
            }
          }
        } catch (error) {
          console.error('处理消息失败:', error)
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket 错误:', error)
        if (isMounted.current) {
          setIsConnected(false)
          setConnectionStatus('disconnected')
        }
      }

      ws.onclose = () => {
        console.log('WebSocket 连接关闭')
        if (isMounted.current) {
          setIsConnected(false)
          setConnectionStatus('disconnected')
          
          // 自动重连
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMounted.current) {
              connectWebSocket()
            }
          }, 3000)
        }
      }
    } catch (error) {
      console.error('连接WebSocket失败:', error)
      if (isMounted.current) {
        setConnectionStatus('disconnected')
        reconnectTimeoutRef.current = setTimeout(() => {
          if (isMounted.current) {
            connectWebSocket()
          }
        }, 3000)
      }
    }
  }, [wsUrl, aiEnabled, handleDanmuMessage])

  // 断开WebSocket
  const disconnectWebSocket = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    
    if (isMounted.current) {
      setIsConnected(false)
      setConnectionStatus('disconnected')
    }
  }, [])

  // 组件挂载和卸载
  useEffect(() => {
    // 组件挂载后连接 WebSocket
    if (isMounted.current && wsUrl) {
      // 延迟一点连接，确保组件完全挂载
      const timer = setTimeout(() => {
        if (isMounted.current) {
          connectWebSocket()
        }
      }, 100)
      
      return () => {
        clearTimeout(timer)
        isMounted.current = false
        disconnectWebSocket()
        stopSpeaking()
        stopTypingEffect()
      }
    }
    
    return () => {
      isMounted.current = false
      disconnectWebSocket()
      stopSpeaking()
      stopTypingEffect()
    }
  }, [wsUrl, connectWebSocket, disconnectWebSocket, stopTypingEffect])

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex flex-col relative overflow-hidden">
      {/* 背景动画效果 */}
      <div className="absolute inset-0 z-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 right-1/4 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-indigo-400 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-6000"></div>
      </div>

      {/* 顶部导航栏 */}
      <div className="relative z-10 bg-black/30 backdrop-blur-sm border-b border-white/10 shadow-lg">
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
              <div className={`w-3 h-3 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' : 
                connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 
                'bg-red-500'
              }`}></div>
              <span className="text-sm text-white/80">
                {connectionStatus === 'connected' ? '已连接' : 
                 connectionStatus === 'connecting' ? '连接中...' : 
                 '未连接'}
              </span>
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

      {/* 消息显示区域 */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          {currentMessage ? (
            <div className="bg-white/10 backdrop-filter backdrop-blur-lg rounded-3xl shadow-2xl p-8 md:p-12 border border-white/20 overflow-hidden animate-fade-in-up">
              {/* 用户名提示 */}
              {currentMessage.username && (
                <div className="mb-4 flex items-center space-x-2 text-white/60 text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>回复 {currentMessage.username}</span>
                </div>
              )}
              
              {/* 消息内容 - 打字机效果 */}
              <div className="relative">
                <p className="text-2xl md:text-4xl font-bold text-white leading-relaxed min-h-[1.5em]">
                  {displayedText}
                  {isTyping && (
                    <span className="inline-block w-0.5 h-[1em] bg-white ml-1 animate-blink">|</span>
                  )}
                </p>
              </div>
              
              {/* 状态指示器 */}
              <div className="mt-6 flex items-center justify-between text-sm text-white/50">
                <div className="flex items-center space-x-4">
                  {isTyping && (
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                      <span>正在输入...</span>
                    </div>
                  )}
                  {isSpeaking && !isTyping && (
                    <div className="flex items-center space-x-1">
                      <svg className="w-4 h-4 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.383 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.383l4-4.617a1 1 0 011.617-.307zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                      </svg>
                      <span>正在播放...</span>
                    </div>
                  )}
                </div>
                <div className="text-xs">
                  {currentMessage.timestamp.toLocaleTimeString('zh-CN', { 
                    hour: '2-digit', 
                    minute: '2-digit', 
                    second: '2-digit' 
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white/10 backdrop-filter backdrop-blur-lg rounded-3xl shadow-2xl p-8 md:p-12 border border-white/20 text-center">
              <div className="flex flex-col items-center justify-center text-white/40">
                <svg className="w-16 h-16 mb-4 opacity-50 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-xl mb-2">等待直播间消息...</p>
                <p className="text-sm">AI回复将显示在这里</p>
                {messageQueue.length > 0 && (
                  <p className="text-xs mt-2 text-white/30">
                    队列中还有 {messageQueue.length} 条消息
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 底部状态栏 */}
      <div className="relative z-10 bg-black/30 backdrop-blur-sm border-t border-white/10 py-3">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between text-sm text-white/60">
          <div className="flex items-center space-x-4">
            {messageQueue.length > 0 && (
              <span className="flex items-center space-x-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span>待处理: {messageQueue.length} 条</span>
              </span>
            )}
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
