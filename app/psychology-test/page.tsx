'use client'
import React, { useState } from 'react'
import Link from 'next/link'

interface Question {
  id: number
  text: string
  options: string[]
}

const questions: Question[] = [
  {
    id: 1,
    text: '在社交场合中，你更倾向于：',
    options: ['主动与他人交流', '等待他人主动接近', '保持安静，观察他人', '寻找熟悉的人']
  },
  {
    id: 2,
    text: '面对压力时，你的第一反应是：',
    options: ['立即采取行动解决问题', '先冷静分析情况', '寻求他人帮助', '暂时逃避，稍后处理']
  },
  {
    id: 3,
    text: '你更喜欢的工作环境是：',
    options: ['团队协作，频繁交流', '独立工作，偶尔讨论', '完全独立，不受干扰', '灵活切换，根据任务决定']
  },
  {
    id: 4,
    text: '做决定时，你更依赖：',
    options: ['直觉和感觉', '逻辑和分析', '他人建议', '以往经验']
  },
  {
    id: 5,
    text: '空闲时间，你更愿意：',
    options: ['参加社交活动', '独自阅读或思考', '进行户外运动', '学习新技能']
  }
]

const PsychologyTestPage = () => {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [showResult, setShowResult] = useState(false)

  const handleAnswer = (optionIndex: number) => {
    const newAnswers = [...answers, optionIndex]
    setAnswers(newAnswers)

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      setShowResult(true)
    }
  }

  const handleRestart = () => {
    setCurrentQuestion(0)
    setAnswers([])
    setShowResult(false)
  }

  const getResult = () => {
    // 简单的测试结果计算（实际项目中应该有更复杂的算法）
    const resultTypes = ['外向型', '内向型', '平衡型', '混合型']
    const totalScore = answers.reduce((sum, answer) => sum + answer, 0)
    const avgScore = totalScore / answers.length
    
    if (avgScore < 1) return resultTypes[0]
    if (avgScore < 2) return resultTypes[1]
    if (avgScore < 3) return resultTypes[2]
    return resultTypes[3]
  }

  if (showResult) {
    const result = getResult()
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 md:p-12">
          <div className="text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-4">测试完成！</h2>
            <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-6 mb-6">
              <p className="text-lg text-gray-600 mb-2">您的性格类型：</p>
              <p className="text-4xl font-bold text-purple-600">{result}</p>
            </div>
            <p className="text-gray-600 mb-8 leading-relaxed">
              这只是一个简单的测试示例。实际的心理测试需要更专业的评估方法和算法。
              建议咨询专业的心理医生进行全面的心理评估。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleRestart}
                className="bg-purple-500 hover:bg-purple-600 text-white px-8 py-3 rounded-xl font-medium transition-colors"
              >
                重新测试
              </button>
              <Link
                href="/"
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-8 py-3 rounded-xl font-medium transition-colors text-center"
              >
                返回首页
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const question = questions[currentQuestion]
  const progress = ((currentQuestion + 1) / questions.length) * 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* 顶部导航栏 */}
        <div className="bg-white rounded-t-2xl shadow-sm border-b border-gray-200 px-6 py-4 mb-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center text-gray-600 hover:text-gray-900 transition-colors">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              返回首页
            </Link>
            <span className="text-sm text-gray-500">
              问题 {currentQuestion + 1} / {questions.length}
            </span>
          </div>
          <div className="mt-4 bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* 问题卡片 */}
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-8 text-center">
            {question.text}
          </h2>

          <div className="space-y-4">
            {question.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswer(index)}
                className="w-full bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 border-2 border-transparent hover:border-purple-300 rounded-xl p-4 text-left transition-all duration-200 transform hover:scale-[1.02]"
              >
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center mr-4 font-semibold">
                    {String.fromCharCode(65 + index)}
                  </div>
                  <span className="text-gray-800 font-medium">{option}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PsychologyTestPage

