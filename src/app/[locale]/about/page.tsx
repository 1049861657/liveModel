'use client'

import Image from 'next/image'
import { motion } from 'motion/react'
import { useTranslations } from 'next-intl'

export default function AboutPage() {
  const t = useTranslations('AboutPage')

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* 顶部横幅 */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 py-16">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/50 to-indigo-600/50"></div>
        </div>
        <div className="relative container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            {t('title')}
          </h1>
          <p className="text-blue-100 text-lg md:text-xl max-w-2xl">
            {t('subtitle')}
          </p>
        </div>
      </div>

      {/* 主要内容 */}
      <div className="container mx-auto px-4 py-16">
        {/* 公司介绍 */}
        <div className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-center"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-6">{t('whoWeAre.title')}</h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              {t('whoWeAre.description')}
            </p>
          </motion.div>
        </div>

        {/* 使命与愿景 */}
        <div className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid md:grid-cols-2 gap-12 items-center"
          >
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">{t('mission.title')}</h2>
              <div className="space-y-4 text-gray-600">
                <p>
                  <strong className="text-gray-900">{t('mission.mission.title')}</strong><br />
                  {t('mission.mission.description')}
                </p>
                <p>
                  <strong className="text-gray-900">{t('mission.vision.title')}</strong><br />
                  {t('mission.vision.description')}
                </p>
              </div>
            </div>
            <div className="relative h-64 md:h-auto">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-2xl"></div>
              <Image
                src="/about/mission-shutterstock.jpg"
                alt={t('mission.title')}
                width={600}
                height={400}
                className="w-full h-auto object-contain"
                quality={100}
                priority={true}
                unoptimized={true}
              />
            </div>
          </motion.div>
        </div>

        {/* 技术特色 */}
        <div className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">{t('features.title')}</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">{t('features.realtime.title')}</h3>
                <p className="text-gray-600">
                  {t('features.realtime.description')}
                </p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">{t('features.formats.title')}</h3>
                <p className="text-gray-600">
                  {t('features.formats.description')}
                </p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">{t('features.security.title')}</h3>
                <p className="text-gray-600">
                  {t('features.security.description')}
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* 联系我们 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="max-w-2xl mx-auto text-center"
        >
          <h2 className="text-3xl font-bold text-gray-900 mb-6">{t('contact.title')}</h2>
          <p className="text-lg text-gray-600 mb-8">
            {t('contact.description')}
          </p>
          <div className="flex justify-center space-x-8">
            <div>
              <p className="text-gray-900 font-medium">{t('contact.email.label')}</p>
              <p className="text-gray-600">{t('contact.email.value')}</p>
            </div>
            <div>
              <p className="text-gray-900 font-medium">{t('contact.phone.label')}</p>
              <p className="text-gray-600">{t('contact.phone.value')}</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
} 