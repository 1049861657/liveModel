'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'react-hot-toast'
import CheckInAnimation from './CheckInAnimation'

interface CheckInButtonProps {
  onCheckIn?: () => Promise<void>  // 添加回调函数
}

export default function CheckInButton({ onCheckIn }: CheckInButtonProps) {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [hasCheckedIn, setHasCheckedIn] = useState(false)
  const [points, setPoints] = useState(0)
  const [showAnimation, setShowAnimation] = useState(false)
  const [earnedPoints, setEarnedPoints] = useState(0)
  const [initialLoading, setInitialLoading] = useState(true)  // 添加初始加载状态

  // 获取签到状态
  const fetchCheckInStatus = async () => {
    try {
      const response = await fetch('/api/check-in')
      if (!response.ok) throw new Error('获取签到状态失败')
      const data = await response.json()
      setHasCheckedIn(data.hasCheckedIn)
      setPoints(data.points)
    } catch (error) {
      console.error('获取签到状态失败:', error)
      toast.error('获取签到状态失败')
    } finally {
      setInitialLoading(false)  // 无论成功失败都结束加载状态
    }
  }

  // 组件加载时获取签到状态
  useEffect(() => {
    if (session) {
      fetchCheckInStatus()
    }
  }, [session])

  // 处理签到
  const handleCheckIn = async () => {
    if (!session) {
      toast.error('请先登录')
      return
    }

    if (hasCheckedIn) {
      toast.error('今天已经签到过了')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/check-in', {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || '签到失败')
      }

      setHasCheckedIn(true)
      setPoints(data.totalPoints)
      setEarnedPoints(data.points)
      setShowAnimation(true)

      // 调用父组件的回调函数更新日历
      if (onCheckIn) {
        await onCheckIn()
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '签到失败')
    } finally {
      setLoading(false)
    }
  }

  if (!session) {
    return null
  }

  return (
    <>
      <div className="relative">
        {/* 签到按钮 */}
        <button
          onClick={handleCheckIn}
          disabled={loading || hasCheckedIn || initialLoading}
          className={`
            relative w-full h-[52px] rounded-xl font-medium transition-all
            ${hasCheckedIn 
              ? 'bg-gray-50 hover:bg-gray-100' 
              : initialLoading
                ? 'bg-gray-50'
                : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'}
            disabled:opacity-60
          `}
        >
          <div className="absolute inset-0 flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              {initialLoading ? (
                <div className="flex items-center gap-2 text-gray-400">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>加载中</span>
                </div>
              ) : loading ? (
                <div className="flex items-center gap-2 text-white">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>签到中</span>
                </div>
              ) : hasCheckedIn ? (
                <div className="flex items-center gap-2 text-gray-500">
                  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>已签到</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-white">
                  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                  </svg>
                  <span>立即签到</span>
                </div>
              )}
            </div>
          </div>
        </button>
      </div>

      {showAnimation && (
        <CheckInAnimation 
          points={earnedPoints}
          onComplete={() => setShowAnimation(false)}
        />
      )}
    </>
  )
} 