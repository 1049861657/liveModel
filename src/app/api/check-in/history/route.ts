import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getMonthRange, getTodayStart, getUTCDayStart } from '@/lib/date'

interface CheckInRecord {
  createdAt: Date
  points: number
}

interface CheckInStats {
  totalDays: number
  currentStreak: number
  maxStreak: number
  totalPoints: number
}

// 计算连续签到统计（使用UTC时间）
function calculateStreaks(checkIns: Date[]): { currentStreak: number; maxStreak: number } {
  if (!checkIns.length) return { currentStreak: 0, maxStreak: 0 }

  // 按UTC时间排序
  const sortedDates = [...checkIns].sort((a, b) => a.getTime() - b.getTime())
  
  // 获取UTC今天0点
  const todayStart = getTodayStart()
  
  let currentStreak = 0
  let maxStreak = 0
  let tempStreak = 1
  
  // 使用UTC时间计算连续天数
  const { maxStreak: calculatedMaxStreak, lastDate, lastStreak } = sortedDates.reduce(
    (acc, curr, index) => {
      if (index === 0) return { ...acc, lastDate: curr, lastStreak: 1 }
      
      const currDayStart = getUTCDayStart(curr)
      const prevDayStart = getUTCDayStart(acc.lastDate)
      const dayDiff = Math.floor(
        (prevDayStart.getTime() - currDayStart.getTime()) 
        / (1000 * 60 * 60 * 24)
      )
      
      if (dayDiff === 1) {
        const newStreak = acc.lastStreak + 1
        return {
          maxStreak: Math.max(acc.maxStreak, newStreak),
          lastDate: curr,
          lastStreak: newStreak
        }
      }
      
      return {
        maxStreak: Math.max(acc.maxStreak, acc.lastStreak),
        lastDate: curr,
        lastStreak: 1
      }
    },
    { maxStreak: 1, lastDate: sortedDates[0], lastStreak: 1 }
  )
  
  // 计算当前连续天数
  const lastCheckIn = sortedDates[sortedDates.length - 1]
  const lastCheckInDayStart = getUTCDayStart(lastCheckIn)
  const daysSinceLastCheckIn = Math.floor(
    (todayStart.getTime() - lastCheckInDayStart.getTime()) 
    / (1000 * 60 * 60 * 24)
  )
  
  if (daysSinceLastCheckIn === 0) {
    currentStreak = lastStreak
  } else if (daysSinceLastCheckIn === 1) {
    currentStreak = lastStreak
  } else {
    currentStreak = 0 // 超过1天未签到，重置连续天数
  }
  
  return {
    currentStreak,
    maxStreak: Math.max(calculatedMaxStreak, maxStreak)
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      )
    }

    // 获取查询参数
    const { searchParams } = new URL(request.url)
    const month = parseInt(searchParams.get('month') || String(new Date().getUTCMonth() + 1))
    const year = parseInt(searchParams.get('year') || String(new Date().getUTCFullYear()))

    // 获取UTC月份范围
    const { start: startDate, end: endDate } = getMonthRange(year, month)

    // 查询签到记录（使用UTC时间）
    const [monthlyCheckIns, allCheckIns] = await Promise.all([
      prisma.checkIn.findMany({
        where: {
          userId: session.user.id,
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: {
          createdAt: 'asc'
        },
        select: {
          createdAt: true,
          points: true
        }
      }),
      prisma.checkIn.findMany({
        where: {
          userId: session.user.id
        },
        orderBy: {
          createdAt: 'asc'
        },
        select: {
          createdAt: true,
          points: true
        }
      })
    ])

    // 计算连续签到统计
    const { currentStreak, maxStreak } = calculateStreaks(
      allCheckIns.map(checkIn => checkIn.createdAt)
    )

    // 计算总积分
    const totalPoints = allCheckIns.reduce((sum, checkIn) => sum + checkIn.points, 0)

    // 构建返回数据
    const stats: CheckInStats = {
      totalDays: allCheckIns.length,
      currentStreak,
      maxStreak,
      totalPoints
    }

    // 返回UTC时间，由客户端负责显示转换
    return NextResponse.json({
      dates: monthlyCheckIns.map(c => c.createdAt),
      stats
    })
  } catch (error) {
    console.error('获取签到记录失败:', error)
    return NextResponse.json(
      { error: '获取签到记录失败' },
      { status: 500 }
    )
  }
} 