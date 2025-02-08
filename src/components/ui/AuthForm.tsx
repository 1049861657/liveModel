'use client'

import { useState } from 'react'
import { Link } from '@/i18n/routing';
import { motion } from 'motion/react'
import { useTranslations } from 'next-intl'

interface AuthFormProps {
  mode: 'login' | 'register'
  onSubmit: (data: any) => Promise<void>
  loading: boolean
  linkHref: string
  linkText: string
}

export default function AuthForm({
  mode,
  onSubmit,
  loading,
  linkHref,
  linkText
}: AuthFormProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  })
  const t = useTranslations('AuthForm')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(formData)
  }

  const inputStyles = mode === 'login' 
    ? "w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
    : "w-full px-4 py-2.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"

  const linkStyles = mode === 'login'
    ? "text-white/80 hover:text-white hover:underline transition-colors"
    : "text-indigo-600 hover:text-indigo-700 hover:underline transition-colors"

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {mode === 'register' && (
        <div>
          <input
            type="text"
            name="name"
            placeholder={t('placeholders.username')}
            required
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className={inputStyles}
          />
        </div>
      )}
      
      <div>
        <input
          type="email"
          name="email"
          placeholder={t('placeholders.email')}
          required
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          className={inputStyles}
        />
      </div>

      <div>
        <input
          type="password"
          name="password"
          placeholder={t('placeholders.password')}
          required
          value={formData.password}
          onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
          className={inputStyles}
        />
      </div>

      <div className="pt-2">
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          type="submit"
          disabled={loading}
          className={`w-full px-6 py-2.5 text-white font-medium rounded-lg 
            ${loading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'} 
            transition-colors duration-200 flex items-center justify-center`}
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {t('buttons.processing')}
            </>
          ) : mode === 'login' ? t('buttons.login') : t('buttons.register')}
        </motion.button>
      </div>

      <div className="text-center text-sm">
        <Link 
          href={linkHref}
          className={linkStyles}
        >
          {linkText}
        </Link>
      </div>
    </form>
  )
} 