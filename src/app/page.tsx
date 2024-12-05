import Link from 'next/link'
import ModelPreviewWrapper from '@/components/home/ModelPreviewWrapper'
import { prisma } from '@/lib/db'

// 在服务器端获取数据
async function getDemoModels() {
  const demoModels = await prisma.demoModel.findMany({
    where: {
      isEnabled: true
    },
    orderBy: {
      order: 'asc'
    },
    select: {
      id: true,
      name: true
    }
  })
  return demoModels
}

export default async function Home() {
  // 在服务器端预加载数据
  const demoModels = await getDemoModels()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="pt-20 pb-32 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-8">
              在线3D模型预览平台
            </h1>
            <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
              轻松上传、预览和分享您的3D模型。支持多种格式，实时渲染，高性能显示。
            </p>
            <div className="flex justify-center gap-4 mb-16">
              <Link 
                href="/models" 
                className="bg-blue-500 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-600 transition"
              >
                浏览模型库
              </Link>
              <Link 
                href="/upload" 
                className="bg-white text-blue-500 px-8 py-3 rounded-lg text-lg font-semibold border-2 border-blue-500 hover:bg-blue-50 transition"
              >
                上传模型
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">示例模型</h2>
          <ModelPreviewWrapper initialModels={demoModels} />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-16">主要功能</h2>
          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-4">实时预览</h3>
              <p className="text-gray-600">支持多种3D文件格式的在线实时预览</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-4">便捷上传</h3>
              <p className="text-gray-600">拖拽上传，支持批量处理</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-4">模型管理</h3>
              <p className="text-gray-600">便捷的模型管理和分享功能</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
} 