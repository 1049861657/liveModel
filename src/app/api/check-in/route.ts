import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getTodayStart, getUTCDayStart, createUTCDate } from '@/lib/date'

// 定义积分规则常量
const POINTS_CONFIG = {
  BASE_POINTS: 10,
  MAX_CONSECUTIVE_BONUS: 20,
  CONSECUTIVE_INCREMENT: 2,
  WEEKLY_BONUS: 30,
  BIWEEKLY_BONUS: 60,
  TRIWEEKLY_BONUS: 90,
  MONTHLY_BONUS: 120
} as const

// 定义月度奖励里程碑
const MILESTONES = [
  { days: 7, bonus: POINTS_CONFIG.WEEKLY_BONUS, requiredPoints: 30 },
  { days: 14, bonus: POINTS_CONFIG.BIWEEKLY_BONUS, requiredPoints: 90 },
  { days: 21, bonus: POINTS_CONFIG.TRIWEEKLY_BONUS, requiredPoints: 180 },
] as const

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      )
    }

    // 获取UTC时间
    const todayStart = getTodayStart()
    const now = new Date()
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0))
    const daysInMonth = monthEnd.getUTCDate()
    
    // 检查今日是否已签到（使用UTC时间）
    const [monthlyCheckIns, todayCheckIn] = await Promise.all([
      prisma.checkIn.findMany({
        where: {
          userId: session.user.id,
          createdAt: {
            gte: monthStart,
            lte: monthEnd
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        select: {
          createdAt: true,
          points: true
        }
      }),
      prisma.checkIn.findFirst({
        where: {
          userId: session.user.id,
          createdAt: {
            gte: todayStart
          }
        }
      })
    ])

    if (todayCheckIn) {
      return NextResponse.json(
        { error: '今天已经签到过了' },
        { status: 400 }
      )
    }

    // 计算连续签到天数（使用UTC时间）
    let consecutiveDays = 1
    if (monthlyCheckIns.length > 0) {
      const yesterday = new Date(todayStart)
      yesterday.setUTCDate(yesterday.getUTCDate() - 1)
      
      const lastCheckIn = monthlyCheckIns[0]
      const lastCheckInDayStart = getUTCDayStart(lastCheckIn.createdAt)
      const yesterdayStart = getUTCDayStart(yesterday)

      if (lastCheckInDayStart.getTime() === yesterdayStart.getTime()) {
        consecutiveDays = monthlyCheckIns.reduce((acc, curr, index) => {
          if (index === 0) return 1
          
          const currDayStart = getUTCDayStart(curr.createdAt)
          const prevDayStart = getUTCDayStart(monthlyCheckIns[index - 1].createdAt)
          const dayDiff = Math.floor(
            (prevDayStart.getTime() - currDayStart.getTime()) 
            / (1000 * 60 * 60 * 24)
          )
          
          return dayDiff === 1 ? acc + 1 : acc
        }, 1) + 1
      }
    }

    // 计算基础积分（包含连续签到奖励）
    const basePoints = Math.min(
      POINTS_CONFIG.BASE_POINTS + (consecutiveDays - 1) * POINTS_CONFIG.CONSECUTIVE_INCREMENT,
      POINTS_CONFIG.MAX_CONSECUTIVE_BONUS
    )

    // 优化：计算月度奖励
    const checkInDays = monthlyCheckIns.length + 1
    const maxPointsInMonth = monthlyCheckIns.length > 0 
      ? Math.max(...monthlyCheckIns.map(c => c.points))
      : 0

    // 优化：使用reduce计算月度奖励
    let monthlyBonus = MILESTONES.reduce((bonus, milestone) => {
      if (checkInDays >= milestone.days && maxPointsInMonth < milestone.requiredPoints) {
        return bonus + milestone.bonus
      }
      return bonus
    }, 0)

    // 添加月度全勤奖励
    if (checkInDays >= daysInMonth && maxPointsInMonth < 300) {
      monthlyBonus += POINTS_CONFIG.MONTHLY_BONUS
    }

    const totalPoints = basePoints + monthlyBonus

    // 创建签到记录（使用UTC时间）
    const checkIn = await prisma.checkIn.create({
      data: {
        userId: session.user.id,
        points: totalPoints,
        createdAt: now
      }
    })

    return NextResponse.json({
      points: totalPoints,
      basePoints,
      monthlyBonus,
      consecutiveDays,
      message: `签到成功！获得 ${basePoints} 基础积分${monthlyBonus > 0 ? ` + ${monthlyBonus} 奖励积分` : ''}`
    })
  } catch (error) {
    console.error('签到失败:', error)
    return NextResponse.json(
      { error: '签到失败，请稍后重试' },
      { status: 500 }
    )
  }
}

// 获取签到状态
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      )
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 获取今日签到状态
    const checkIn = await prisma.checkIn.findFirst({
      where: {
        userId: session.user.id,
        createdAt: {
          gte: today
        }
      }
    })

    // 获取用户总积分
    const userPoints = await prisma.checkIn.aggregate({
      where: {
        userId: session.user.id
      },
      _sum: {
        points: true
      }
    })

    return NextResponse.json({
      hasCheckedIn: !!checkIn,
      points: userPoints._sum.points || 0
    })
  } catch (error) {
    console.error('获取签到状态失败:', error)
    return NextResponse.json(
      { error: '获取状态失败' },
      { status: 500 }
    )
  }
} 