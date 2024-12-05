import ModelList from '@/components/model/ModelList'
import ModelFilters from '@/components/model/ModelFilters'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

// 在服务器端获取数据
async function getModels() {
  const session = await getServerSession(authOptions)
  
  const models = await prisma.model.findMany({
    include: {
      user: {
        select: {
          name: true,
          email: true,
        }
      },
      _count: {
        select: {
          favorites: true,
          reviews: true
        }
      },
      ...(session ? {
        favorites: {
          where: { userId: session.user.id },
          select: { id: true }
        }
      } : {})
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  const processedModels = models.map(model => {
    const { favorites, ...rest } = model
    return {
      ...rest,
      isFavorited: session ? favorites?.length > 0 : false,
      _count: {
        favorites: model._count.favorites,
        reviews: model._count.reviews
      }
    }
  })

  return processedModels
}

export default async function ModelsPage() {
  const initialModels = await getModels()

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* 顶部横幅区域 */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 py-16">
        {/* 装饰性背景元素 */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/50 to-indigo-600/50"></div>
          <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-indigo-500/30"></div>
        </div>

        <div className="relative container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            {/* 左侧标题区域 */}
            <div className="max-w-2xl">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
                3D模型库
              </h1>
              <p className="text-blue-100 text-lg md:text-xl">
                探索、分享和下载精彩的3D模型，让创意无限延伸
              </p>
            </div>

            {/* 修改上传按钮样式 */}
            <Link
              href="/upload"
              className="group relative inline-flex items-center justify-center gap-2 bg-white px-8 py-4 text-lg font-semibold text-blue-600 rounded-xl shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:shadow-blue-500/30 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/20 active:scale-[0.98]"
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl blur opacity-20 group-hover:opacity-30 transition-opacity"></div>
              <svg 
                className="w-6 h-6 transition-transform group-hover:scale-110 group-hover:rotate-12" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 4v16m8-8H4" 
                />
              </svg>
              <span className="relative">上传模型</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="container mx-auto px-4 py-8">
        {/* 筛选器卡片 */}
        <div className="backdrop-blur-sm bg-white/80 rounded-2xl shadow-lg shadow-blue-500/5 border border-gray-100 mb-8 transition-all hover:shadow-xl hover:shadow-blue-500/10">
          <ModelFilters />
        </div>

        {/* 模型列表 */}
        <div className="relative">
          {/* 装饰性背景元素 */}
          <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 via-transparent to-transparent -z-10 rounded-3xl"></div>
          
          <ModelList initialModels={initialModels} />
        </div>
      </div>
    </main>
  )
} 