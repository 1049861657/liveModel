'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'

type ContentItem = 
  | string 
  | { 
      type: 'image'
      src: string
      alt: string
      width: number
      height: number
    }
  | {
      type: 'steps'
      content: string[]
    }

interface Question {
  id: string
  q: string
  a: ContentItem | ContentItem[]
}

interface Category {
  id: string
  category: string
  questions: Question[]
}

// 渲染内容的组件
function RenderContent({ content }: { content: ContentItem | ContentItem[] }) {
  // 如果是字符串，直接渲染为段落
  if (typeof content === 'string') {
    return <p className="text-gray-600">{content}</p>
  }

  // 如果是单个对象（非数组），包装成数组处理
  const contentArray = Array.isArray(content) ? content : [content]

  return (
    <div className="space-y-4">
      {contentArray.map((item, index) => {
        if (typeof item === 'string') {
          return <p key={index} className="text-gray-600">{item}</p>
        }
        
        if (item.type === 'image') {
          return (
            <div key={index} className="relative my-6">
              <div className="rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                <Image
                  src={item.src}
                  alt={item.alt}
                  width={item.width}
                  height={item.height}
                  className="w-full h-auto object-contain"
                  quality={100}
                  priority={true}
                  unoptimized={true}
                />
              </div>
              {item.alt && (
                <div className="mt-2 text-sm text-gray-500 text-center">
                  {item.alt}
                </div>
              )}
            </div>
          )
        }

        if (item.type === 'steps') {
          return (
            <div key={index} className="bg-gray-50 rounded-lg p-4">
              {item.content.map((step: string, stepIndex: number) => (
                <div key={stepIndex} className="flex items-start gap-3 mb-2 last:mb-0">
                  <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center flex-shrink-0 text-sm">
                    {stepIndex + 1}
                  </div>
                  <p className="text-gray-600 pt-1">{step}</p>
                </div>
              ))}
            </div>
          )
        }

        return null
      })}
    </div>
  )
}

const helpItems: Category[] = [
  {
    id: 'model',
    category: '模型相关',
    questions: [
      {
        id: 'model-1',
        q: '支持哪些格式的模型？',
        a: [
          '目前支持 .glb 和 .dae (Collada) 格式的模型文件。'
        ]
      },
      {
        id: 'model-2',
        q: '为什么我的模型显示不正确？',
        a: [
          '请确保模型文件完整且格式正确。对于 DAE 格式，请检查是否上传了所需的贴图文件。',
          {
            type: 'image',
            src: '/help/model-2.png',
            alt: '上传贴图步骤示例',
            width: 600,
            height: 300
          }
        ]
      },
      {
        id: 'model-3',
        q: '模型文件大小有限制吗？',
        a: '单个模型文件大小限制为 100MB。建议在上传前对模型进行适当压缩以获得更好的加载性能。'
      }
    ]
  },
  {
    id: 'animation',
    category: '动画相关',
    questions: [
      {
        id: 'animation-1',
        q: '如何为模型添加动画？',
        a: [
          '对于 DAE 模型，您可以按照以下步骤添加 SMD 动画：',
          {
            type: 'steps',
            content: [
              '在关联模型列表找到您的 DAE 模型',
              '在弹出的对话框中选择 SMD 格式的动画文件',
              '点击上传完成添加'
            ]
          },
          {
            type: 'image',
            src: '/help/animation-1.png',
            alt: '添加动画步骤示例',
            width: 600,
            height: 300
          },
          '上传完成后，您可以在模型预览页面的左侧找到新添加的动画。'
        ]
      },
      {
        id: 'animation-2',
        q: '为什么我无法上传动画？',
        a: 'SMD 动画仅支持 DAE 格式的模型。如果您使用的是 GLB 格式，请使用模型自带的动画。'
      },
      {
        id: 'animation-3',
        q: '如何调整动画播放速度？',
        a: '在动画播放控制器中，您可以使用速度滑块来调整动画的播放速度。'
      },
      {
        id: 'animation-4',
        q: '为什么动画播放不流畅？',
        a: '这可能是由于动画文件过大或帧率设置不当导致。建议检查动画文件的帧率设置，并确保动画文件大小适中。'
      }
    ]
  },
  {
    id: 'preview',
    category: '查看与预览',
    questions: [
      {
        id: 'preview-1',
        q: '如何旋转和缩放模型？',
        a: '使用鼠标左键拖动可以旋转模型，滚轮可以缩放模型，按住鼠标右键拖动可以平移视角。'
      },
      {
        id: 'preview-2',
        q: '如何重置视角？',
        a: '点击右上角的"重置视角"按钮可以将视角恢复到默认状态。'
      },
      {
        id: 'preview-3',
        q: '如何隐藏/显示某些部件？',
        a: '在右侧面板的"模型部件"列表中，点击眼睛图标可以控制各个部件的显示状态。'
      }
    ]
  },
  {
    id: 'other',
    category: '其他问题',
    questions: [
      {
        id: 'other-1',
        q: '如何设置模型为私有？',
        a: '在上传模型时，取消勾选"公开模型"选项即可将模型设为私有，只有您自己可以查看。'
      },
      {
        id: 'other-2',
        q: '如何删除已上传的模型或动画？',
        a: '在模型列表中找到要删除的模型，点击删除按钮即可。删除模型会同时删除与之关联的所有动画。'
      },
      {
        id: 'other-3',
        q: '遇到其他技术问题怎么办？',
        a: '如果您遇到其他技术问题，请联系技术支持或在问题反馈区提交您的问题。'
      }
    ]
  }
]

export default function HelpPage() {
  const searchParams = useSearchParams()
  const [expandedCategory, setExpandedCategory] = useState<string | null>(helpItems[0].id)
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(helpItems[0].questions[0].id)

  // 处理 URL 参数
  useEffect(() => {
    const category = searchParams.get('category')
    const question = searchParams.get('question')
    
    if (category) {
      setExpandedCategory(category)
    }
    if (question) {
      setSelectedQuestion(question)
    }
  }, [searchParams])

  const selectedQuestionData = helpItems
    .flatMap(category => category.questions)
    .find(q => q.id === selectedQuestion)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">帮助中心</h1>
        <p className="text-gray-600 mt-2">
          在这里您可以找到关于模型预览系统的常见问题解答。如果没有找到您需要的答案，请联系技术支持。
        </p>
      </div>

      <div className="flex gap-8">
        {/* 左侧导航 */}
        <div className="w-72 shrink-0">
          <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
            {helpItems.map((category) => (
              <div key={category.id} className="overflow-hidden">
                <button
                  onClick={() => setExpandedCategory(
                    expandedCategory === category.id ? null : category.id
                  )}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <span className="font-medium text-gray-700">{category.category}</span>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      expandedCategory === category.id ? 'rotate-180' : ''
                    }`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {expandedCategory === category.id && (
                  <div className="bg-gray-50">
                    {category.questions.map((question) => (
                      <button
                        key={question.id}
                        onClick={() => setSelectedQuestion(question.id)}
                        className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                          selectedQuestion === question.id
                            ? 'bg-blue-50 text-blue-600'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {question.q}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 右侧内容 */}
        <div className="flex-1">
          <div className="bg-white rounded-xl shadow-sm p-6">
            {selectedQuestionData ? (
              <>
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                  {selectedQuestionData.q}
                </h2>
                <div className="prose prose-blue max-w-none">
                  <RenderContent content={selectedQuestionData.a} />
                </div>
              </>
            ) : (
              <div className="text-gray-500 text-center py-8">
                请选择一个问题查看详细解答
              </div>
            )}
          </div>

          <div className="mt-8 text-center text-sm text-gray-500">
            还有其他问题？
            <Link href="/feedback" className="text-blue-500 hover:text-blue-600 ml-1">
              点击这里反馈
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
} 