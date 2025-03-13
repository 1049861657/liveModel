'use client'

import { useTranslations } from 'next-intl'

interface ChatHeaderProps {
  onlineUsers: number;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
}

export function ChatHeader({ 
  onlineUsers, 
  connectionStatus = 'disconnected'
}: ChatHeaderProps) {
  const t = useTranslations('ChatPage');

  return (
    <div className="flex items-center justify-between px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
      <div className="flex items-center space-x-4">
        <div>
          <h2 className="text-xl font-bold">{t('title')}</h2>
          <p className="text-sm text-purple-200">{t('subtitle')}</p>
        </div>
        
        {/* 连接状态指示器 */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1 bg-white/10 rounded-full px-3 py-1">
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-400 animate-pulse' : 
              connectionStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' : 
              'bg-red-400'
            }`}></div>
            <span className="text-xs text-purple-100">
              {t('onlineUsers', { count: onlineUsers })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
} 