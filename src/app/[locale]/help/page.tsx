'use client'

import { useState, useEffect } from 'react'
import { Link } from '@/i18n/routing'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useLocale } from 'next-intl'
import type { ContentItem, Category } from '@/types/help'

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

        if (item.type === 'list') {
          return (
            <div key={index} className="space-y-3">
              {item.items.map((listItem, listIndex) => (
                <div key={listIndex} className="bg-gray-50 rounded-lg p-4">
                  <div className="font-medium text-gray-900 mb-1">{listItem.title}</div>
                  <div className="text-gray-600 text-sm">{listItem.description}</div>
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

export default function HelpPage() {
  const t = useTranslations('HelpPage')
  const locale = useLocale()
  const searchParams = useSearchParams()
  const [helpItems, setHelpItems] = useState<Category[]>([])
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null)

  // 动态加载对应语言的内容数据
  useEffect(() => {
    async function loadContent() {
      try {
        // 动态导入对应语言的内容
        const module = await import(`messages/help/${locale}.ts`)
        const items = module.helpItems as Category[]
        setHelpItems(items)
        
        // 设置默认展开的分类和问题
        if (items.length > 0) {
          setExpandedCategory(prev => prev || items[0].id)
          setSelectedQuestion(prev => prev || (items[0].questions[0]?.id || null))
        }
      } catch (error) {
        console.error('Failed to load content for locale:', locale, error)
      }
    }
    
    loadContent()
  }, [locale])

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
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-gray-600 mt-2">
          {t('description')}
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
                {t('selectQuestion')}
              </div>
            )}
          </div>

          <div className="mt-8 text-center text-sm text-gray-500">
            {t('feedback.text')}
            <Link href="/feedback" className="text-blue-500 hover:text-blue-600 ml-1">
              {t('feedback.link')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
} 