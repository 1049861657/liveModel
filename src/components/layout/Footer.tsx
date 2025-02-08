'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

export default function Footer() {
  const [mounted, setMounted] = useState(false);
  const t = useTranslations('Footer');

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <footer className="bg-gray-800 text-white">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('sections.about.title')}</h3>
            <p className="text-gray-400">
              {t('sections.about.description')}
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('sections.quickLinks.title')}</h3>
            <ul className="space-y-2">
              <li><Link href="/models" className="text-gray-400 hover:text-white">{t('sections.quickLinks.models')}</Link></li>
              <li><Link href="/upload" className="text-gray-400 hover:text-white">{t('sections.quickLinks.upload')}</Link></li>
              <li><Link href="/help" className="text-gray-400 hover:text-white">{t('sections.quickLinks.help')}</Link></li>
              <li><Link href="/about" className="text-gray-400 hover:text-white">{t('links.about')}</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('sections.contact.title')}</h3>
            <p className="text-gray-400">
              {t('sections.contact.labels.email')}：{mounted ? t('sections.contact.email') : ''}<br />
              {t('sections.contact.labels.phone')}：{t('sections.contact.phone')}
            </p>
          </div>
        </div>
        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
          <p>{t('copyright')}</p>
        </div>
      </div>
    </footer>
  )
} 