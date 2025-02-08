import { Suspense } from 'react'
import ModelListClient from '@/components/model/ModelList'
import ModelFilters from '@/components/model/ModelFilters'
import ModelSkeleton from '@/components/model/ModelSkeleton'
import { prisma } from '@/lib/db'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { type ExtendedModel } from '@/types/model'
import { Link } from '@/i18n/routing'
import { useTranslations } from 'next-intl'

// 在服务器端获取数据
async function getModels(searchParams: { [key: string]: string | string[] | undefined }) {
  const session = await getServerSession(authOptions)
  
  // 解析查询参数
  const showFavorites = searchParams.favorites === 'true'
  const format = searchParams.format as string
  const owner = searchParams.owner as string
  const search = searchParams.search as string
  const sort = (searchParams.sort as string) || 'newest'
  const page = parseInt(searchParams.page as string || '1')
  const limit = parseInt(searchParams.limit as string || '9')

  // 构建查询条件
  const where: any = {}
    
  // 格式过滤
  if (format) {
    where.format = format
  }

  // 搜索过滤
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } }
    ]
  }

  // 所有权过滤
  if (owner === 'mine' && session?.user?.id) {
    where.userId = session.user.id
  } else if (session?.user?.id) {
    // 非 mine 模式下显示公开的和自己的
    where.OR = [
      { isPublic: true },
      { userId: session.user.id }
    ]
  } else {
    // 未登录只显示公开的
    where.isPublic = true
  }

  // 收藏过滤
  if (showFavorites && session?.user?.id) {
    where.favorites = {
      some: {
        userId: session.user.id
      }
    }
  }

  // 构建排序条件
  let orderBy: any = {}
  switch (sort) {
    case 'oldest':
      orderBy = { createdAt: 'asc' }
      break
    case 'name':
      orderBy = { name: 'asc' }
      break
    case 'favorites':
      orderBy = { favorites: { _count: 'desc' } }
      break
    default: // newest
      orderBy = { createdAt: 'desc' }
  }

  // 使用事务执行查询以确保数据一致性
  const [models, total] = await prisma.$transaction([
    // 获取分页数据
    prisma.model.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: {
              select: {
                url: true
              }
            }
          }
        },
        _count: {
          select: {
            favorites: true,
            reviews: true
          }
        },
        ...(session?.user?.id ? {
          favorites: {
            where: { userId: session.user.id },
            select: { id: true }
          }
        } : {})
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit
    }),
    // 获取总数
    prisma.model.count({ where })
  ])

  // 处理返回数据
  const processedModels: ExtendedModel[] = models.map((model: any) => {
    const { favorites, ...rest } = model
    return {
      ...rest,
      isFavorited: session?.user?.id ? favorites?.length > 0 : false,
      _count: {
        favorites: model._count?.favorites || 0,
        reviews: model._count?.reviews || 0
      }
    }
  })

  return {
    models: processedModels,
    total,
    pages: Math.ceil(total / limit)
  }
}

// 顶部横幅组件
function Banner() {
  const t = useTranslations('ModelsPage')
  
  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 py-16">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/50 to-indigo-600/50"></div>
        <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-indigo-500/30"></div>
      </div>

      <div className="relative container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
              {t('title')}
            </h1>
            <p className="text-blue-100 text-lg md:text-xl">
              {t('description')}
            </p>
          </div>

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
            <span className="relative">{t('uploadButton')}</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

// 异步获取模型数据组件
async function ModelListContainer({ searchParams }: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const initialModels = await getModels(searchParams)
  return <ModelListClient initialModels={initialModels} />
}

export default async function ModelsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const viewSize = searchParams.viewSize as 'large' | 'medium' | 'small' || 'large'
  
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Banner />

      <div className="container mx-auto px-4 py-8">
        <div className="backdrop-blur-sm bg-white/80 rounded-2xl shadow-lg shadow-blue-500/5 border border-gray-100 mb-8 transition-all hover:shadow-xl hover:shadow-blue-500/10">
          <ModelFilters />
        </div>

        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 via-transparent to-transparent -z-10 rounded-3xl"></div>
          
          <Suspense fallback={<ModelSkeleton viewSize={viewSize} count={6} />}>
            <ModelListContainer searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </main>
  )
} 