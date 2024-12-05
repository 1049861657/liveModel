'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { format, startOfMonth, endOfMonth, isSameMonth, isToday, isBefore } from 'date-fns'
import { eachDayOfInterval } from 'date-fns/eachDayOfInterval'
import { getDay } from 'date-fns/getDay'
import { zhCN } from 'date-fns/locale'
import { motion } from 'framer-motion'
import CheckInButton from '@/components/checkin/CheckInButton'

interface CheckInStats {
  totalDays: number
  currentStreak: number
  maxStreak: number
  totalPoints: number
}

export default function CheckInPage() {
  const { data: session } = useSession()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [checkInDates, setCheckInDates] = useState<Date[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<CheckInStats>({
    totalDays: 0,
    currentStreak: 0,
    maxStreak: 0,
    totalPoints: 0
  })

  // 获取当月签到记录
  useEffect(() => {
    if (session) {
      fetchCheckInHistory()
    }
  }, [session, currentDate])

  const fetchCheckInHistory = async () => {
    try {
      const response = await fetch(`/api/check-in/history?month=${currentDate.getMonth() + 1}&year=${currentDate.getFullYear()}`)
      if (!response.ok) throw new Error('获取签到记录失败')
      const data = await response.json()
      setCheckInDates(data.dates.map((d: string) => new Date(d)))
      setStats(data.stats)
    } catch (error) {
      console.error('获取签到记录失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 生成日历数据
  const calendarDays = (() => {
    const firstDay = startOfMonth(currentDate)
    const lastDay = endOfMonth(currentDate)
    
    // 获取月初是周几（0是周日，1是周一，以此类推）
    let firstDayOfWeek = getDay(firstDay)
    // 转换为以周一为第一天（0是周一，6是周日）
    firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1
    
    // 获取月末是周几
    let lastDayOfWeek = getDay(lastDay)
    // 转换为以周一为第一天
    lastDayOfWeek = lastDayOfWeek === 0 ? 6 : lastDayOfWeek - 1

    // 计算需要显示的上个月的天数
    const daysFromPrevMonth = firstDayOfWeek
    // 计算需要显示的下个月的天数
    const daysFromNextMonth = 6 - lastDayOfWeek

    // 获取上个月的日期
    const prevMonthDays = daysFromPrevMonth > 0 
      ? eachDayOfInterval({
          start: new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1),
          end: new Date(currentDate.getFullYear(), currentDate.getMonth(), 0)
        }).slice(-daysFromPrevMonth)
      : []

    // 获取当前月的日期
    const currentMonthDays = eachDayOfInterval({
      start: firstDay,
      end: lastDay
    })

    // 获取下个月的日期
    const nextMonthDays = daysFromNextMonth > 0
      ? eachDayOfInterval({
          start: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
          end: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, daysFromNextMonth)
        })
      : []

    // 合并所有日期
    return [...prevMonthDays, ...currentMonthDays, ...nextMonthDays]
  })()

  // 检查日期是否已签到
  const isCheckedIn = (date: Date) => {
    return checkInDates.some(d => 
      d.getDate() === date.getDate() &&
      d.getMonth() === date.getMonth() &&
      d.getFullYear() === date.getFullYear()
    )
  }

  // 渲染日期单元格
  const renderCalendarDay = (day: Date, index: number) => {
    const checked = isCheckedIn(day)
    const isCurrentMonth = isSameMonth(day, currentDate)
    const isPast = isBefore(day, new Date()) && !isToday(day)

    return (
      <motion.div
        key={day.toString()}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: index * 0.02 }}
        className={`
          aspect-square flex items-center justify-center rounded-lg relative text-sm
          ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-700'}
          ${isToday(day) ? 'bg-blue-50 font-bold text-blue-600' : ''}
          ${checked ? 'bg-green-50' : ''}
        `}
      >
        <span className="relative z-10">{format(day, 'd')}</span>
        {checked && (
          <motion.svg
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="absolute bottom-0.5 right-0.5 w-3 h-3 text-green-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
          </motion.svg>
        )}
      </motion.div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* 签到按钮和统计卡片并排 */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* 签到按钮卡片 */}
          <div className="md:col-span-1 bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center justify-center">
            <div className="mb-4 text-center">
              <div className="flex items-center justify-center gap-2">
                <h2 className="text-xl font-bold text-gray-800">每日签到</h2>
                <div className="group relative">
                  <svg 
                    className="w-5 h-5 text-gray-400 cursor-help" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                    />
                  </svg>
                  <div className="absolute left-1/2 top-full mt-2 -translate-x-1/2 w-72 p-4 bg-gray-800 text-white text-sm rounded-lg 
                    opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="text-left space-y-2">
                      <p className="font-semibold border-b border-gray-700 pb-1">签到规则</p>
                      <div className="space-y-3">
                        <div>
                          <p className="font-medium text-blue-300">基础奖励</p>
                          <p>每日签到可获得10积分</p>
                        </div>
                        <div>
                          <p className="font-medium text-green-300">连续签到</p>
                          <p>每天额外+2积分（最高20分）</p>
                        </div>
                        <div>
                          <p className="font-medium text-yellow-300">月度奖励</p>
                          <ul className="space-y-1 pl-4">
                            <li>• 满1周：+30积分</li>
                            <li>• 满2周：+60积分</li>
                            <li>• 满3周：+90积分</li>
                            <li>• 月度全勤：+120积分</li>
                          </ul>
                        </div>
                        <div className="text-xs text-gray-400 border-t border-gray-700 pt-2">
                          <p>* 断签后连续天数重新计算</p>
                          <p>* 积分可用于平台功能解锁</p>
                        </div>
                      </div>
                    </div>
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 
                      border-l-[6px] border-l-transparent
                      border-b-[6px] border-b-gray-800
                      border-r-[6px] border-r-transparent">
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">连续签到可获得额外积分</p>
            </div>
            <CheckInButton onCheckIn={fetchCheckInHistory} />
          </div>

          {/* 统计数据卡片 */}
          <div className="md:col-span-2 bg-white rounded-2xl shadow-lg p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-xl">
                <div className="text-2xl font-bold text-blue-500 mb-1">{stats.totalDays}</div>
                <div className="text-xs text-gray-600">总签到天数</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-xl">
                <div className="text-2xl font-bold text-green-500 mb-1">{stats.currentStreak}</div>
                <div className="text-xs text-gray-600">连续签到</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-xl">
                <div className="text-2xl font-bold text-purple-500 mb-1">{stats.maxStreak}</div>
                <div className="text-xs text-gray-600">最长连续</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-xl">
                <div className="text-2xl font-bold text-yellow-500 mb-1">{stats.totalPoints}</div>
                <div className="text-xs text-gray-600">总积分</div>
              </div>
            </div>
          </div>
        </div>

        {/* 日历卡片 */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* 日历头部 */}
          <div className="p-4 border-b bg-gradient-to-r from-blue-500 to-blue-600">
            <div className="flex items-center justify-between text-white">
              <button
                onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1))}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-xl font-bold">
                {format(currentDate, 'yyyy年MM月')}
              </h2>
              <button
                onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1))}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                disabled={isSameMonth(currentDate, new Date())}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* 日历主体 */}
          <div className="p-4">
            {/* 星期标题 */}
            <div className="grid grid-cols-7 mb-2">
              {['一', '二', '三', '四', '五', '六', '日'].map(day => (
                <div key={day} className="text-center font-medium text-gray-500 text-sm">
                  {day}
                </div>
              ))}
            </div>

            {/* 日期网格 */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, index) => renderCalendarDay(day, index))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 