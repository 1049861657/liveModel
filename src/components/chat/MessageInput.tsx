'use client'

import { useTranslations } from 'next-intl'

interface MessageInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSending?: boolean;
  disabled?: boolean;
}

export function MessageInput({ 
  value, 
  onChange, 
  onSubmit, 
  isSending = false,
  disabled = false
}: MessageInputProps) {
  const t = useTranslations('ChatPage');
  const canSend = !disabled && !isSending && value.trim().length > 0;

  return (
    <form onSubmit={onSubmit} className="p-4 border-t bg-white overflow-hidden w-full">
      <div className="flex space-x-3 w-full max-w-full">
        <input
          type="text"
          value={value}
          onChange={onChange}
          disabled={disabled}
          placeholder={t('input.placeholder')}
          className="flex-1 min-w-0 rounded-xl border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
        />
        <button
          type="submit"
          disabled={!canSend}
          className={`px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium transition-all duration-200 disabled:opacity-50 text-sm shrink-0
            ${canSend ? 'hover:shadow-lg hover:shadow-purple-500/25' : ''}
          `}
        >
          {isSending ? (
            <span className="flex items-center">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
              {t('input.sending')}
            </span>
          ) : (
            t('input.send')
          )}
        </button>
      </div>
    </form>
  );
} 