'use client'
import React, { useState, useEffect } from 'react'
import Link from 'next/link'

interface ChatConfig {
  id?: number
  page_key: string
  page_name: string
  config_data: {
    tts?: {
      type: 'browser' | 'edge' | 'third-party'
      autoPlay?: boolean
      edgeOptions?: {
        voice?: string
        rate?: string
        pitch?: string
      }
      thirdPartyOptions?: {
        provider?: 'baidu' | 'aliyun' | 'tencent'
      }
    }
    ai?: {
      model?: string
      temperature?: number
      maxTokens?: number
      systemPrompt?: string
      enabled?: boolean
    }
    autoReply?: {
      enabled?: boolean
      keywords?: string
      message?: string
    }
  }
  is_active?: number
  description?: string
}

const ChatConfigPage = () => {
  const [configs, setConfigs] = useState<ChatConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [editingConfig, setEditingConfig] = useState<ChatConfig | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState<ChatConfig>({
    page_key: '',
    page_name: '',
    config_data: {},
    is_active: 1,
    description: '',
  })

  // 获取配置列表
  const fetchConfigs = async () => {
    try {
      const response = await fetch('/api/chat-config')
      const result = await response.json()
      if (result.success) {
        setConfigs(result.data)
      }
    } catch (error) {
      console.error('获取配置失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConfigs()
  }, [])

  // 保存配置
  const handleSave = async () => {
    try {
      const url = editingConfig
        ? `/api/chat-config?id=${editingConfig.id}`
        : '/api/chat-config'
      
      const method = editingConfig ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const result = await response.json()
      if (result.success) {
        alert(editingConfig ? '配置更新成功' : '配置创建成功')
        setShowForm(false)
        setEditingConfig(null)
        setFormData({
          page_key: '',
          page_name: '',
          config_data: {},
          is_active: 1,
          description: '',
        })
        fetchConfigs()
      } else {
        alert(result.error || '操作失败')
      }
    } catch (error) {
      console.error('保存配置失败:', error)
      alert('保存配置失败')
    }
  }

  // 删除配置
  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个配置吗？')) return

    try {
      const response = await fetch(`/api/chat-config?id=${id}`, {
        method: 'DELETE',
      })

      const result = await response.json()
      if (result.success) {
        alert('配置删除成功')
        fetchConfigs()
      } else {
        alert(result.error || '删除失败')
      }
    } catch (error) {
      console.error('删除配置失败:', error)
      alert('删除配置失败')
    }
  }

  // 编辑配置
  const handleEdit = async (config: ChatConfig) => {
    try {
      // 从数据库重新获取完整配置数据
      const response = await fetch(`/api/chat-config?id=${config.id}`)
      const result = await response.json()
      
      if (result.success && result.data) {
        const fullConfig = result.data
        // 确保config_data是对象格式
        if (typeof fullConfig.config_data === 'string') {
          fullConfig.config_data = JSON.parse(fullConfig.config_data)
        }
        setEditingConfig(fullConfig)
        setFormData(fullConfig)
        setShowForm(true)
      } else {
        alert('获取配置详情失败')
      }
    } catch (error) {
      console.error('获取配置详情失败:', error)
      alert('获取配置详情失败')
    }
  }

  // 切换启用状态
  const handleToggleActive = async (config: ChatConfig) => {
    try {
      const response = await fetch('/api/chat-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: config.id,
          is_active: config.is_active ? 0 : 1,
        }),
      })

      const result = await response.json()
      if (result.success) {
        fetchConfigs()
      }
    } catch (error) {
      console.error('更新状态失败:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">加载中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center text-gray-600 hover:text-gray-900">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            返回首页
          </Link>
          <h1 className="text-xl font-semibold text-gray-800">聊天配置管理</h1>
          <button
            onClick={() => {
              setEditingConfig(null)
              setFormData({
                page_key: '',
                page_name: '',
                config_data: {},
                is_active: 1,
                description: '',
              })
              setShowForm(true)
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            新建配置
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* 配置列表 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">页面标识</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">页面名称</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">描述</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {configs.map((config) => (
                <tr key={config.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {config.page_key}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {config.page_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleActive(config)}
                      className={`px-2 py-1 rounded text-xs ${
                        config.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {config.is_active ? '启用' : '禁用'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {config.description || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleEdit(config)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => config.id && handleDelete(config.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 配置表单弹窗 */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-semibold mb-4">
                {editingConfig ? '编辑配置' : '新建配置'}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    页面标识 *
                  </label>
                  <input
                    type="text"
                    value={formData.page_key}
                    onChange={(e) => setFormData({ ...formData, page_key: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="如：chat, live-chat-bot"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    页面名称 *
                  </label>
                  <input
                    type="text"
                    value={formData.page_name}
                    onChange={(e) => setFormData({ ...formData, page_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="页面显示名称"
                  />
                </div>

                {/* TTS配置 */}
                <div className="border-b pb-4">
                  <h3 className="text-lg font-semibold mb-3">TTS（语音）配置</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        TTS方案类型
                      </label>
                      <select
                        value={formData.config_data?.tts?.type || 'browser'}
                        onChange={(e) => {
                          const newType = e.target.value as 'browser' | 'edge' | 'third-party'
                          setFormData({
                            ...formData,
                            config_data: {
                              ...formData.config_data,
                              tts: {
                                type: newType,
                                autoPlay: formData.config_data?.tts?.autoPlay ?? true,
                                edgeOptions: formData.config_data?.tts?.edgeOptions,
                                thirdPartyOptions: formData.config_data?.tts?.thirdPartyOptions,
                              },
                            },
                          })
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="browser">浏览器原生API</option>
                        <option value="edge">Edge TTS</option>
                        <option value="third-party">第三方TTS</option>
                      </select>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="autoPlay"
                        checked={formData.config_data?.tts?.autoPlay ?? true}
                        onChange={(e) => setFormData({
                          ...formData,
                          config_data: {
                            ...formData.config_data,
                            tts: {
                              type: formData.config_data?.tts?.type || 'browser',
                              autoPlay: e.target.checked,
                              edgeOptions: formData.config_data?.tts?.edgeOptions,
                              thirdPartyOptions: formData.config_data?.tts?.thirdPartyOptions,
                            },
                          },
                        })}
                        className="mr-2"
                      />
                      <label htmlFor="autoPlay" className="text-sm text-gray-700">
                        自动播放语音
                      </label>
                    </div>
                    {formData.config_data?.tts?.type === 'edge' && (
                      <div className="space-y-2 pl-4 border-l-2 border-blue-200">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            语音名称
                          </label>
                          <input
                            type="text"
                            value={formData.config_data?.tts?.edgeOptions?.voice || 'zh-CN-XiaoxiaoNeural'}
                            onChange={(e) => setFormData({
                              ...formData,
                              config_data: {
                                ...formData.config_data,
                                tts: {
                                  type: formData.config_data?.tts?.type || 'browser',
                                  autoPlay: formData.config_data?.tts?.autoPlay ?? true,
                                  edgeOptions: {
                                    ...formData.config_data?.tts?.edgeOptions,
                                    voice: e.target.value,
                                  },
                                  thirdPartyOptions: formData.config_data?.tts?.thirdPartyOptions,
                                },
                              },
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            placeholder="zh-CN-XiaoxiaoNeural"
                          />
                        </div>
                      </div>
                    )}
                    {formData.config_data?.tts?.type === 'third-party' && (
                      <div className="space-y-2 pl-4 border-l-2 border-blue-200">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            服务提供商
                          </label>
                          <select
                            value={formData.config_data?.tts?.thirdPartyOptions?.provider || 'baidu'}
                            onChange={(e) => setFormData({
                              ...formData,
                              config_data: {
                                ...formData.config_data,
                                tts: {
                                  type: formData.config_data?.tts?.type || 'browser',
                                  autoPlay: formData.config_data?.tts?.autoPlay ?? true,
                                  edgeOptions: formData.config_data?.tts?.edgeOptions,
                                  thirdPartyOptions: {
                                    ...formData.config_data?.tts?.thirdPartyOptions,
                                    provider: e.target.value as 'baidu' | 'aliyun' | 'tencent',
                                  },
                                },
                              },
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          >
                            <option value="baidu">百度</option>
                            <option value="aliyun">阿里云</option>
                            <option value="tencent">腾讯云</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* AI配置 */}
                <div className="border-b pb-4">
                  <h3 className="text-lg font-semibold mb-3">AI配置</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        模型名称
                      </label>
                      <input
                        type="text"
                        value={formData.config_data?.ai?.model || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          config_data: {
                            ...formData.config_data,
                            ai: {
                              ...formData.config_data?.ai,
                              model: e.target.value,
                            },
                          },
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="doubao-seed-1-6-251015"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          温度 (Temperature)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="2"
                          value={formData.config_data?.ai?.temperature ?? 0.7}
                          onChange={(e) => setFormData({
                            ...formData,
                            config_data: {
                              ...formData.config_data,
                              ai: {
                                ...formData.config_data?.ai,
                                temperature: parseFloat(e.target.value),
                              },
                            },
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          最大Token数
                        </label>
                        <input
                          type="number"
                          value={formData.config_data?.ai?.maxTokens ?? 200}
                          onChange={(e) => setFormData({
                            ...formData,
                            config_data: {
                              ...formData.config_data,
                              ai: {
                                ...formData.config_data?.ai,
                                maxTokens: parseInt(e.target.value),
                              },
                            },
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        系统提示词
                      </label>
                      <textarea
                        value={formData.config_data?.ai?.systemPrompt || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          config_data: {
                            ...formData.config_data,
                            ai: {
                              ...formData.config_data?.ai,
                              systemPrompt: e.target.value,
                            },
                          },
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        rows={3}
                        placeholder="你是一个AI助手..."
                      />
                    </div>
                  </div>
                </div>

                {/* 高级配置（JSON编辑） */}
                <div>
                  <details className="cursor-pointer">
                    <summary className="text-sm font-medium text-gray-700 mb-2">
                      高级配置（JSON编辑）
                    </summary>
                    <textarea
                      value={JSON.stringify(formData.config_data, null, 2)}
                      onChange={(e) => {
                        try {
                          setFormData({
                            ...formData,
                            config_data: JSON.parse(e.target.value),
                          })
                        } catch (err) {
                          // JSON解析错误时保持原值
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm mt-2"
                      rows={10}
                      placeholder='{"tts": {...}, "ai": {...}}'
                    />
                  </details>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    描述
                  </label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={3}
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active === 1}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked ? 1 : 0 })}
                    className="mr-2"
                  />
                  <label htmlFor="is_active" className="text-sm text-gray-700">
                    启用此配置
                  </label>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowForm(false)
                    setEditingConfig(null)
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ChatConfigPage

