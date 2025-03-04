import dynamic from 'next/dynamic'
import { Link } from '@/i18n/routing'
import { useTranslations } from 'next-intl'

const AnimatedBackground = dynamic(() => import('@/components/background/AnimatedBackground'), { ssr: false })

export default function Home() {
  const t = useTranslations('HomePage')

  return (
    <main className="relative min-h-screen flex flex-col">
      <AnimatedBackground />

      <div className="flex-grow">
        {/* Hero Section */}
        <section className="relative pt-20 pb-32 px-4">
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="text-center">
              <div className="inline-block mb-4 px-4 py-1.5 bg-white/60 backdrop-blur-md rounded-full border border-indigo-100/30">
                <h1 className="text-indigo-700 text-sm font-medium">✨ {t('platform')}</h1>
              </div>
              <h1 className="text-7xl font-bold mb-8 relative group">
                <span className="relative inline-block text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 animate-gradient-x hover:scale-105 transition-transform duration-300">
                  {t('title')}
                </span>
              </h1>
              <p className="text-xl text-gray-600 max-w-5xl mx-auto leading-relaxed overflow-hidden">
                {t('description')}
              </p>
              <div className="flex justify-center gap-4 mb-16 mt-12">
                <Link 
                  href="/models" 
                  className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:shadow-[0_0_20px_rgba(79,70,229,0.4)] transition-all duration-200"
                >
                  {t('browse')}
                </Link>
                <Link 
                  href="/upload" 
                  className="bg-white/60 backdrop-blur-md text-indigo-700 px-8 py-3 rounded-lg text-lg font-semibold border border-indigo-100 hover:bg-white/80 transition-all duration-200 hover:shadow-[0_0_20px_rgba(79,70,229,0.2)]"
                >
                  {t('upload')}
                </Link>
              </div>

              {/* Stats Section */}
              <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto">
                <div className="bg-white/60 backdrop-blur-md p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-indigo-100/30">
                  <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-blue-600 mb-2">10+</div>
                  <div className="text-gray-600">{t('stats.models')}</div>
                </div>
                <div className="bg-white/60 backdrop-blur-md p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-indigo-100/30">
                  <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-blue-600 mb-2">1+</div>
                  <div className="text-gray-600">{t('stats.users')}</div>
                </div>
                <div className="bg-white/60 backdrop-blur-md p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-indigo-100/30">
                  <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-blue-600 mb-2">99.9%</div>
                  <div className="text-gray-600">{t('stats.uptime')}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-white/40 backdrop-blur-md relative z-10">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600">
                {t('features.title')}
              </h2>
              <p className="text-gray-600 mt-4">{t('features.subtitle')}</p>
            </div>
            <div className="grid md:grid-cols-3 gap-12">
              <div className="bg-white/60 backdrop-blur-md p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-indigo-100/30 hover:scale-105">
                <div className="bg-gradient-to-br from-indigo-100 to-blue-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-4 text-center text-gray-800">{t('features.preview.title')}</h3>
                <p className="text-gray-600 text-center">{t('features.preview.description')}</p>
              </div>
              <div className="bg-white/60 backdrop-blur-md p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-indigo-100/30 hover:scale-105">
                <div className="bg-gradient-to-br from-indigo-100 to-blue-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-4 text-center text-gray-800">{t('features.upload.title')}</h3>
                <p className="text-gray-600 text-center">{t('features.upload.description')}</p>
              </div>
              <div className="bg-white/60 backdrop-blur-md p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-indigo-100/30 hover:scale-105">
                <div className="bg-gradient-to-br from-indigo-100 to-blue-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-4 text-center text-gray-800">{t('features.manage.title')}</h3>
                <p className="text-gray-600 text-center">{t('features.manage.description')}</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
} 