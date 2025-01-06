import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { toUTCStorage, getTodayStart } from '@/lib/date'

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      )
    }

    const todayStartUTC = getTodayStart()
    
    // 检查今天是否已经签到
    const existingCheckIn = await prisma.checkIn.findFirst({
      where: {
        userId: session.user.id,
        createdAt: {
          gte: todayStartUTC
        }
      }
    })

    if (existingCheckIn) {
      return NextResponse.json(
        { error: '今天已经签到过了' },
        { status: 400 }
      )
    }

    // 计算昨天的时间范围
    const yesterdayStart = new Date(todayStartUTC)
    yesterdayStart.setDate(yesterdayStart.getDate() - 1)
    
    // 获取本月所有签到记录，用于计算周期奖励
    const thisMonth = new Date()
    const monthStart = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1)
    const monthEnd = new Date(thisMonth.getFullYear(), thisMonth.getMonth() + 1, 0)
    
    const monthlyCheckIns = await prisma.checkIn.findMany({
      where: {
        userId: session.user.id,
        createdAt: {
          gte: monthStart,
          lte: monthEnd
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    // 计算连续签到天数和基础积分
    let consecutiveDays = 1
    let basePoints = 10

    // 检查昨天是否签到
    const yesterdayCheckIn = await prisma.checkIn.findFirst({
      where: {
        userId: session.user.id,
        createdAt: {
          gte: yesterdayStart,
          lt: todayStartUTC
        }
      }
    })

    if (yesterdayCheckIn) {
      // 获取最近的连续签到记录
      let lastCheckIn = yesterdayCheckIn
      let tempConsecutiveDays = 1
      
      for (let i = monthlyCheckIns.length - 1; i >= 0; i--) {
        const currentCheckIn = monthlyCheckIns[i]
        const dayDiff = Math.floor(
          (lastCheckIn.createdAt.getTime() - currentCheckIn.createdAt.getTime()) 
          / (1000 * 60 * 60 * 24)
        )
        
        if (dayDiff === 1) {
          tempConsecutiveDays++
          lastCheckIn = currentCheckIn
        } else {
          break
        }
      }
      
      consecutiveDays = tempConsecutiveDays + 1
      // 连续签到加分（每次+2，最多到20分）
      basePoints = Math.min(10 + (consecutiveDays - 1) * 2, 20)
    }

    // 计算月度奖励
    let monthlyBonus = 0
    const checkInDays = monthlyCheckIns.length + 1 // 包括今天
    
    // 计算当月总天数
    const daysInMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth() + 1, 0).getDate()
    
    // 检查历史签到记录中的最高积分，用于判断是否已经发放过月度奖励
    const maxPointsInMonth = Math.max(0, ...monthlyCheckIns.map(c => c.points))
    
    // 只在达到新的里程碑时发放奖励
    if (maxPointsInMonth < 30 && checkInDays >= 7) {
      monthlyBonus += 30  // 满1周
    }
    if (maxPointsInMonth < 90 && checkInDays >= 14) {
      monthlyBonus += 60  // 满2周
    }
    if (maxPointsInMonth < 180 && checkInDays >= 21) {
      monthlyBonus += 90  // 满3周
    }
    if (maxPointsInMonth < 300 && checkInDays >= daysInMonth) {
      monthlyBonus += 120 // 月度全勤
    }

    const totalPoints = basePoints + monthlyBonus

    // 使用工具函数转换时间
    const now = new Date()
    const utcNow = toUTCStorage(now)

    // 只创建签到记录，不更新用户积分
    const checkIn = await prisma.checkIn.create({
      data: {
        userId: session.user.id,
        points: totalPoints,
        createdAt: utcNow
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