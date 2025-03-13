'use client'

import { useTranslations } from 'next-intl'

interface WelcomeMessageProps {
  onDismiss: () => void;
}

export function WelcomeMessage({ onDismiss }: WelcomeMessageProps) {
  const t = useTranslations('ChatPage');

  return (
    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 px-6 py-3 text-sm text-gray-600 border-b border-purple-100/20 relative">
      <div className="flex items-center pr-8">
        <svg className="w-4 h-4 mr-2 text-purple-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p>{t('welcome.description')}</p>
      </div>
      <button 
        onClick={onDismiss}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label={t('welcome.dismiss')}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
} 