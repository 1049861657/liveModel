import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getMonthRange, fromUTCStorage } from '@/lib/date'

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
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1))
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))

    // 使用工具函数获取月份范围
    const { start: startDate, end: endDate } = getMonthRange(year, month)

    // 获取指定月份的签到记录
    const checkIns = await prisma.checkIn.findMany({
      where: {
        userId: session.user.id,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    // 转换为本地时间
    const localCheckIns = checkIns.map(checkIn => ({
      ...checkIn,
      createdAt: fromUTCStorage(checkIn.createdAt)
    }))

    // 获取所有签到记录用于计算统计信息
    const allCheckIns = await prisma.checkIn.findMany({
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

    // 计算连续签到和最长连续签到
    let currentStreak = 0
    let maxStreak = 0
    let tempStreak = 0
    let lastCheckInDate: Date | null = null
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 按日期排序处理签到记录
    const sortedCheckIns = allCheckIns
      .map(checkIn => fromUTCStorage(checkIn.createdAt))
      .sort((a, b) => a.getTime() - b.getTime())

    for (let i = 0; i < sortedCheckIns.length; i++) {
      const checkInDate = new Date(sortedCheckIns[i])
      checkInDate.setHours(0, 0, 0, 0)

      if (i === 0) {
        tempStreak = 1
        lastCheckInDate = checkInDate
      } else {
        const dayDiff = Math.floor(
          (checkInDate.getTime() - lastCheckInDate!.getTime()) / (1000 * 60 * 60 * 24)
        )

        if (dayDiff === 1) {
          // 连续签到
          tempStreak++
        } else {
          // 连续中断
          if (tempStreak > maxStreak) {
            maxStreak = tempStreak
          }
          tempStreak = 1
        }
        lastCheckInDate = checkInDate
      }

      // 更新最长连续记录
      if (tempStreak > maxStreak) {
        maxStreak = tempStreak
      }

      // 如果是最后一次签到，检查是否是今天，更新当前连续天数
      if (i === sortedCheckIns.length - 1) {
        const daysSinceLastCheckIn = Math.floor(
          (today.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
        )
        
        if (daysSinceLastCheckIn === 0) {
          // 今天已签到，当前连续天数就是临时连续天数
          currentStreak = tempStreak
        } else if (daysSinceLastCheckIn === 1) {
          // 昨天签到过，但今天还没签到，连续天数保持不变
          currentStreak = tempStreak
        } else {
          // 超过一天没签到，连续中断
          currentStreak = 0
        }
      }
    }

    // 计算总积分
    const totalPoints = allCheckIns.reduce((sum, checkIn) => sum + checkIn.points, 0)

    return NextResponse.json({
      dates: localCheckIns.map(c => c.createdAt),
      stats: {
        totalDays: allCheckIns.length,
        currentStreak,
        maxStreak,
        totalPoints
      }
    })
  } catch (error) {
    console.error('获取签到记录失败:', error)
    return NextResponse.json(
      { error: '获取签到记录失败' },
      { status: 500 }
    )
  }
} 