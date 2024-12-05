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
      <div className="flex items-center gap-4">
        <button
          onClick={handleCheckIn}
          disabled={loading || hasCheckedIn || initialLoading}  // 添加 initialLoading 条件
          className={`
            relative px-6 py-2 rounded-lg font-medium text-white
            ${hasCheckedIn 
              ? 'bg-gray-400 cursor-not-allowed' 
              : initialLoading
                ? 'bg-gray-300 cursor-wait'  // 添加加载状态样式
                : 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700'}
            disabled:opacity-50 transition-colors
          `}
        >
          {initialLoading ? (
            <div className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              加载中...
            </div>
          ) : loading ? (
            <div className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              签到中...
            </div>
          ) : hasCheckedIn ? '已签到' : '签到'}
        </button>

        <div className="flex items-center gap-1 text-gray-600">
          <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          {initialLoading ? (
            <span className="animate-pulse">...</span>
          ) : (
            <>
              <span className="font-medium">{points}</span>
              <span className="text-sm">积分</span>
            </>
          )}
        </div>
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