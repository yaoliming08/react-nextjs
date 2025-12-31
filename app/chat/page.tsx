'use client'
import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { callDoubaoAIThroughAPI } from '../live-chat-bot/aiService'
import { speakText, stopSpeaking, isTTSAvailable } from '../lib/tts'
import type { TTSType } from '@/config/tts'

interface Message {
  id: number
  text: string
  sender: 'user' | 'bot'
  timestamp: Date
}

const ChatPage = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: '你好！我是AI助手，有什么可以帮助您的吗？',
      sender: 'bot',
      timestamp: new Date()
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [autoPlayVoice, setAutoPlayVoice] = useState(true) // 自动播放AI回复语音
  const [playingMessageId, setPlayingMessageId] = useState<number | null>(null) // 当前正在播放的消息ID
  const [ttsType, setTtsType] = useState<TTSType>('browser') // TTS方案类型，从数据库读取
  const [thirdPartyProvider, setThirdPartyProvider] = useState<'baidu' | 'aliyun' | 'tencent'>('baidu') // 第三方TTS提供商，从数据库读取
  const [isMounted, setIsMounted] = useState(false) // 客户端挂载状态，用于避免水合错误
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // 从API获取配置（客户端）
  useEffect(() => {
    // 标记为已挂载
    setIsMounted(true)
    
    // 从API获取配置
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/chat-config?page_key=chat')
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
            if (config.tts.thirdPartyOptions?.provider) {
              setThirdPartyProvider(config.tts.thirdPartyOptions.provider)
            }
          }
        }
      } catch (error) {
        console.error('获取配置失败:', error)
        // 失败时使用默认值
      }
    }
    
    fetchConfig()
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessageText = inputValue.trim()
    const userMessage: Message = {
      id: messages.length + 1,
      text: userMessageText,
      sender: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      // 调用豆包AI获取回复（传递page_key以便API从数据库读取配置）
      const aiResponse = await callDoubaoAIThroughAPI(userMessageText, '用户聊天消息', 'chat')
      
      if (aiResponse.success && aiResponse.reply) {
        const botMessage: Message = {
          id: messages.length + 2,
          text: aiResponse.reply,
          sender: 'bot',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, botMessage])
        
        // 如果启用自动播放，播放AI回复
        if (autoPlayVoice && isTTSAvailable(ttsType)) {
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
                provider: thirdPartyProvider,
              } : undefined,
              onStart: () => setPlayingMessageId(botMessage.id),
              onEnd: () => setPlayingMessageId(null),
              onError: (error) => {
                console.error('语音播放失败:', error)
                setPlayingMessageId(null)
              }
            }).catch(() => {
              setPlayingMessageId(null)
            })
          }, 300)
        }
      } else {
        // AI回复失败，显示错误消息
        const errorMessage: Message = {
          id: messages.length + 2,
          text: `抱歉，我暂时无法回复。${aiResponse.error ? `错误：${aiResponse.error}` : '请稍后再试。'}`,
          sender: 'bot',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, errorMessage])
      }
    } catch (error) {
      // 捕获异常
      console.error('调用AI失败:', error)
      const errorMessage: Message = {
        id: messages.length + 2,
        text: '抱歉，发生了错误，请稍后再试。',
        sender: 'bot',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // 播放/停止消息语音
  const handlePlayVoice = (message: Message) => {
    if (playingMessageId === message.id) {
      // 如果正在播放这条消息，则停止
      stopSpeaking()
      setPlayingMessageId(null)
    } else {
      // 停止当前播放，播放新消息
      stopSpeaking()
      speakText(message.text, {
        ttsType,
        edgeOptions: ttsType === 'edge' ? {
          voice: 'zh-CN-XiaoxiaoNeural',
          rate: '+0%',
          pitch: '+0Hz',
        } : undefined,
        thirdPartyOptions: ttsType === 'third-party' ? {
          provider: thirdPartyProvider,
        } : undefined,
        onStart: () => setPlayingMessageId(message.id),
        onEnd: () => setPlayingMessageId(null),
        onError: (error) => {
          console.error('语音播放失败:', error)
          setPlayingMessageId(null)
        }
      }).catch(() => {
        setPlayingMessageId(null)
      })
    }
  }

  // 组件卸载时停止播放
  useEffect(() => {
    return () => {
      stopSpeaking()
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      {/* 顶部导航栏 */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center text-gray-600 hover:text-gray-900 transition-colors">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            返回首页
          </Link>
          <h1 className="text-xl font-semibold text-gray-800">机器人聊天</h1>
          <div className="w-24"></div> {/* 占位符，保持居中 */}
        </div>
      </div>

      {/* 消息区域 */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs md:max-w-md px-4 py-3 rounded-2xl ${
                  message.sender === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-800 shadow-md'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
                    <p className={`text-xs mt-1 ${message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                      {message.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {message.sender === 'bot' && isMounted && isTTSAvailable(ttsType) && (
                    <button
                      onClick={() => handlePlayVoice(message)}
                      className={`flex-shrink-0 p-1.5 rounded-full transition-colors ${
                        playingMessageId === message.id
                          ? 'bg-red-100 text-red-600 hover:bg-red-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      title={playingMessageId === message.id ? '停止播放' : '播放语音'}
                    >
                      {playingMessageId === message.id ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.383 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.383l4-4.617a1 1 0 011.617-.307zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white text-gray-800 shadow-md px-4 py-3 rounded-2xl">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 输入区域 */}
      <div className="bg-white border-t border-gray-200 py-4">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-end space-x-3">
            <div className="flex-1 bg-gray-100 rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white transition-all">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="输入消息..."
                className="w-full bg-transparent border-none outline-none resize-none text-gray-800 placeholder-gray-400"
                rows={1}
                style={{ maxHeight: '120px' }}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-2xl font-medium transition-colors flex items-center space-x-2"
            >
              <span>发送</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChatPage


