import { Suspense } from 'react'
import ModelListClient from '@/components/model/ModelList'
import ModelFilters from '@/components/model/ModelFilters'
import ModelSkeleton from '@/components/model/ModelSkeleton'
import { Link } from '@/i18n/routing'
import { useTranslations } from 'next-intl'

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
          <div className="max-w-4xl">
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
function ModelListContainer({ searchParams }: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  return <ModelListClient searchParams={searchParams} />
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