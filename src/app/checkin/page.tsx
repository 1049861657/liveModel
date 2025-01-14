'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { format, startOfMonth, endOfMonth, isSameMonth, isToday, isBefore } from 'date-fns'
import { eachDayOfInterval } from 'date-fns/eachDayOfInterval'
import { getDay } from 'date-fns/getDay'
import { zhCN } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'
import CheckInButton from '@/components/checkin/CheckInButton'
import Avatar from '@/components/ui/Avatar'

interface CheckInStats {
  totalDays: number
  currentStreak: number
  maxStreak: number
  totalPoints: number
}

interface RankingUser {
  id: string
  name: string | null
  email: string | null
  avatar: { url: string } | null
  points: number
  rank: number
}

export default function CheckInPage() {
  const { data: session } = useSession()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [checkInDates, setCheckInDates] = useState<Date[]>([])
  const [loading, setLoading] = useState(true)
  const [isAnimating, setIsAnimating] = useState(false)
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right')
  const [stats, setStats] = useState<CheckInStats>({
    totalDays: 0,
    currentStreak: 0,
    maxStreak: 0,
    totalPoints: 0
  })
  const [rankings, setRankings] = useState<RankingUser[]>([])
  const [rankingsLoading, setRankingsLoading] = useState(true)

  // 处理月份切换
  const handleMonthChange = (direction: 'prev' | 'next') => {
    if (isAnimating) return // 防止动画过程中重复触发

    setIsAnimating(true)
    setSlideDirection(direction === 'prev' ? 'right' : 'left')
    setLoading(true)
    setCheckInDates([])
    
    // 更新日期
    setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + (direction === 'prev' ? -1 : 1)))
  }

  // 动画完成后的处理
  const handleAnimationComplete = () => {
    setIsAnimating(false)
  }

  // 获取当月签到记录
  useEffect(() => {
    if (session) {
      const controller = new AbortController()
      
      fetchCheckInHistory(controller.signal)
      
      return () => {
        controller.abort()
      }
    }
  }, [session, currentDate])

  const fetchCheckInHistory = async (signal?: AbortSignal) => {
    try {
      const response = await fetch(
        `/api/check-in/history?month=${currentDate.getMonth() + 1}&year=${currentDate.getFullYear()}`,
        { signal }
      )
      if (!response.ok) throw new Error('获取签到记录失败')
      const data = await response.json()
      setCheckInDates(data.dates.map((d: string) => new Date(d)))
      setStats(data.stats)
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return // 忽略中止错误
      }
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
    if (loading) return false // 加载状态下返回 false
    return checkInDates.some(d => 
      d.getDate() === date.getDate() &&
      d.getMonth() === date.getMonth() &&
      d.getFullYear() === date.getFullYear()
    )
  }

  // 渲染日期单元格
  const renderCalendarDay = useMemo(() => (day: Date, index: number) => {
    const checked = isCheckedIn(day)
    const isCurrentMonth = isSameMonth(day, currentDate)
    const isTodays = isToday(day)
    const isWeekend = [6, 0].includes(getDay(day))

    return (
      <motion.div
        key={`${day.getTime()}-${index}`}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ 
          opacity: loading ? 0.5 : 1, 
          scale: 1,
          transition: { 
            duration: 0.2,
            delay: index * 0.01 // 添加微小延迟创造波浪效果
          }
        }}
        className={`calendar-day relative aspect-square cursor-default
          ${!isCurrentMonth ? 'opacity-50' : ''}
          ${loading ? 'animate-pulse' : ''}
        `}
      >
        {/* 今日特效 */}
        {isTodays && !loading && (
          <motion.div 
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-lg" />
            <div className="absolute inset-0 backdrop-blur-[2px] rounded-lg" />
            <motion.div 
              className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_70%)]"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </motion.div>
        )}
        
        {/* 日期容器 */}
        <div className={`
          relative z-10 w-full h-full flex items-center justify-center
          before:absolute before:inset-2 before:rounded-xl before:transition-colors before:duration-300
          ${loading ? 'before:bg-gray-100' :
            isTodays ? 'before:bg-gradient-to-br before:from-blue-500 before:to-purple-500 before:shadow-lg before:shadow-blue-500/20' : 
            checked ? 'before:bg-gradient-to-br before:from-green-500 before:to-teal-500 before:shadow-lg before:shadow-green-500/20' : 
            'before:bg-white'}
        `}>
          {/* 日期数字 */}
          <span className={`
            relative z-10 text-sm font-medium
            ${loading ? 'text-gray-400' :
              isTodays || checked ? 'text-white' : 
              isWeekend ? 'text-blue-500' : 'text-gray-700'}
          `}>
            {format(day, 'd')}
          </span>

          {/* 签到标记 */}
          {!loading && checked && (
            <motion.div 
              className="check-mark absolute -right-1 -top-1 w-4 h-4"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
            >
              <motion.div 
                className="absolute inset-0 bg-yellow-300 rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                style={{ opacity: 0.3 }}
              />
              <div className="relative w-full h-full bg-gradient-to-br from-yellow-300 to-yellow-400 rounded-full border-2 border-white shadow-lg" />
            </motion.div>
          )}
        </div>
      </motion.div>
    )
  }, [loading, currentDate, checkInDates])

  // 获取排行榜数据
  const fetchRankings = async () => {
    try {
      setRankingsLoading(true)
      const response = await fetch('/api/check-in/rankings')
      if (!response.ok) throw new Error('获取排行榜失败')
      const data = await response.json()
      setRankings(data)
    } catch (error) {
      console.error('获取排行榜失败:', error)
    } finally {
      setRankingsLoading(false)
    }
  }

  // 监听排行榜刷新事件
  useEffect(() => {
    const handleRefreshRankings = () => {
      fetchRankings()
    }

    window.addEventListener('refreshRankings', handleRefreshRankings)
    return () => {
      window.removeEventListener('refreshRankings', handleRefreshRankings)
    }
  }, [])

  useEffect(() => {
    if (session) {
      fetchRankings()
    }
  }, [session])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-6 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-[320px,1fr] gap-6">
          {/* 左侧栏 */}
          <div className="space-y-3">
            {/* 签到按钮卡片 */}
            <div className="bg-white rounded-xl shadow-lg">
              <div className="p-5 text-center relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-gray-800">每日签到</h2>
                    <div className="group relative">
                      <svg 
                        className="w-5 h-5 text-gray-400 cursor-help hover:text-gray-600 transition-colors" 
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
                      <div className="absolute left-0 top-full mt-1 w-72 bg-white text-gray-600 text-sm rounded-xl 
                        opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[9999] shadow-xl border border-gray-100">
                        <div className="relative">
                          {/* 小三角形指示器 */}
                          <div className="absolute -top-2 left-2 w-4 h-4 bg-white transform rotate-45 border-l border-t border-gray-100"></div>
                          <div className="relative">
                            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-t-xl">
                              <p className="font-semibold">签到规则</p>
                            </div>
                            <div className="p-4 space-y-3">
                              <div className="bg-blue-50 rounded-lg p-2.5">
                                <p className="font-medium text-blue-600 mb-1">基础奖励</p>
                                <p className="text-gray-600">每日签到可获得10积分</p>
                              </div>
                              <div className="bg-green-50 rounded-lg p-2.5">
                                <p className="font-medium text-green-600 mb-1">连续签到</p>
                                <p className="text-gray-600">每天额外+2积分（最高20分）</p>
                              </div>
                              <div className="bg-yellow-50 rounded-lg p-2.5">
                                <p className="font-medium text-yellow-600 mb-1">月度奖励</p>
                                <ul className="space-y-1 text-gray-600">
                                  <li>• 满1周：+30积分</li>
                                  <li>• 满2周：+60积分</li>
                                  <li>• 满3周：+90积分</li>
                                  <li>• 月度全勤：+120积分</li>
                                </ul>
                              </div>
                              <div className="text-xs text-gray-400 border-t border-gray-100 pt-2 space-y-1">
                                <p>* 断签后连续天数重新计算</p>
                                <p>* 积分可用于平台功能解锁</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute -inset-1">
                    <div className="w-full h-full mx-auto rotate-180 opacity-30 blur-lg filter bg-gradient-to-r from-blue-400 via-blue-500 to-purple-500"></div>
                  </div>
                  <div className="relative">
                    <CheckInButton onCheckIn={fetchCheckInHistory} />
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-3">连续签到可获得额外积分</p>
              </div>
            </div>

            {/* 统计数据卡片 */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="grid grid-cols-2">
                <div className="relative p-4 group hover:bg-gray-50/80 transition-colors">
                  <div className="flex flex-col items-center">
                    <div className="text-2xl font-bold text-blue-500">{stats.totalDays}</div>
                    <div className="mt-2 px-3 py-1 bg-blue-50 rounded-full">
                      <div className="text-xs text-blue-600 flex items-center gap-1.5 font-medium">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                        总签到天数
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative p-4 group hover:bg-gray-50/80 transition-colors">
                  <div className="flex flex-col items-center">
                    <div className="text-2xl font-bold text-green-500">{stats.currentStreak}</div>
                    <div className="mt-2 px-3 py-1 bg-green-50 rounded-full">
                      <div className="text-xs text-green-600 flex items-center gap-1.5 font-medium">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                        </svg>
                        当前连续
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative p-4 group hover:bg-gray-50/80 transition-colors">
                  <div className="flex flex-col items-center">
                    <div className="text-2xl font-bold text-purple-500">{stats.maxStreak}</div>
                    <div className="mt-2 px-3 py-1 bg-purple-50 rounded-full">
                      <div className="text-xs text-purple-600 flex items-center gap-1.5 font-medium">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        最长连续
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative p-4 group hover:bg-gradient-to-br from-yellow-50/80 to-orange-50/80 transition-colors">
                  <div className="flex flex-col items-center">
                    <div className="text-2xl font-bold text-yellow-500">{stats.totalPoints}</div>
                    <div className="mt-2 px-3 py-1 bg-yellow-50 rounded-full">
                      <div className="text-xs text-yellow-600 flex items-center gap-1.5 font-medium">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        总积分
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 积分排行榜 */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="p-4">
                <h3 className="text-lg font-bold text-gray-800 mb-4">积分排行榜</h3>
                <div className="space-y-3">
                  {rankingsLoading ? (
                    // 加载占位
                    Array.from({ length: 6 }).map((_, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center gap-3 p-2"
                      >
                        {/* 排名占位 */}
                        <div className="w-6 h-6 rounded-full bg-gray-100 animate-pulse" />
                        
                        {/* 头像和名称占位 */}
                        <div className="flex items-center gap-2 flex-1">
                          <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse" />
                          <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
                        </div>
                        
                        {/* 积分占位 */}
                        <div className="flex items-center gap-1">
                          <div className="w-4 h-4 rounded-full bg-gray-100 animate-pulse" />
                          <div className="h-4 w-8 bg-gray-100 rounded animate-pulse" />
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    rankings.map((user, index) => (
                      <motion.div 
                        key={user.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`flex items-center gap-3 p-2 rounded-lg transition-colors
                          ${user.id === session?.user?.id ? 'bg-blue-50' : 'hover:bg-gray-50'}
                        `}
                      >
                        {/* 排名 */}
                        <div className={`
                          w-6 h-6 flex items-center justify-center rounded-full text-sm font-bold
                          ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                            index === 1 ? 'bg-gray-100 text-gray-700' :
                            index === 2 ? 'bg-orange-100 text-orange-700' :
                            'bg-blue-50 text-blue-600'}
                        `}>
                          {user.rank}
                        </div>

                        {/* 头像和名称 */}
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Avatar user={user} size="sm" />
                          <span className="text-sm font-medium text-gray-700 truncate">
                            {user.name || '未知用户'}
                          </span>
                        </div>

                        {/* 积分 */}
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span className="text-sm font-semibold text-yellow-600">
                            {user.points}
                          </span>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 右侧：日历卡片 */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* 月份导航 */}
            <div className="calendar-header relative h-16 bg-gradient-to-br from-blue-500 to-purple-500">
              <div className="absolute inset-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.2),transparent_60%)]" />
              </div>
              <div className="relative h-full flex items-center justify-between px-6">
                <button
                  onClick={() => !isAnimating && handleMonthChange('prev')}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    isAnimating ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/10 hover:scale-110 hover:shadow-lg hover:shadow-white/10'
                  }`}
                  disabled={isAnimating}
                >
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-3">
                  <span className="text-white/80">{format(currentDate, 'yyyy年')}</span>
                  <span>{format(currentDate, 'MM月')}</span>
                </h2>
                <button
                  onClick={() => !isAnimating && !isSameMonth(currentDate, new Date()) && handleMonthChange('next')}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    isAnimating || isSameMonth(currentDate, new Date()) 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:bg-white/10 hover:scale-110 hover:shadow-lg hover:shadow-white/10'
                  }`}
                  disabled={isAnimating || isSameMonth(currentDate, new Date())}
                >
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 日历主体 */}
            <AnimatePresence mode="wait" onExitComplete={handleAnimationComplete}>
              <motion.div
                key={currentDate.toISOString()}
                initial={{ 
                  x: slideDirection === 'left' ? '30%' : '-30%',
                  opacity: 0
                }}
                animate={{ 
                  x: 0,
                  opacity: 1
                }}
                exit={{ 
                  x: slideDirection === 'left' ? '-30%' : '30%',
                  opacity: 0
                }}
                transition={{
                  type: "tween",
                  duration: 0.3,
                  ease: "easeInOut"
                }}
                className="calendar-content p-6 bg-gradient-to-br from-white to-blue-50/30"
              >
                {/* 星期标题 */}
                <div className="grid grid-cols-7 mb-6">
                  {['一', '二', '三', '四', '五', '六', '日'].map((day, index) => (
                    <motion.div 
                      key={day}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`
                        weekday-title text-center font-medium text-sm pb-2
                        border-b transition-colors duration-300
                        ${index >= 5 ? 'text-blue-500 border-blue-100' : 'text-gray-400 border-gray-100'}
                      `}
                    >
                      {day}
                    </motion.div>
                  ))}
                </div>

                {/* 日期网格 */}
                <div className="grid grid-cols-7 gap-2">
                  {calendarDays.map((day, index) => renderCalendarDay(day, index))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
} 