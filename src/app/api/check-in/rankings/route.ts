import { NextResponse } from 'next/server'
import {prisma} from '@/lib/db'

interface RankedUser {
  id: string
  name: string | null
  email: string | null
  avatar: { url: string } | null
  points: number
  rank?: number
}

export async function GET() {
  try {
    // 获取所有用户的签到统计
    const rankings = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        checkIns: {
          select: {
            points: true,
          }
        }
      }
    })

    // 计算每个用户的总积分并排序
    const rankedUsers = rankings
      .map((user): RankedUser => ({
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        points: user.checkIns.reduce((sum, checkIn) => {
          return sum + (checkIn.points || 0)
        }, 0)
      }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 6)  // 只取前6名
      .map((user, index) => ({
        ...user,
        rank: index + 1
      }))

    return NextResponse.json(rankedUsers)
  } catch (error) {
    console.error('获取排行榜失败:', error)
    return NextResponse.json(
      { error: '获取排行榜失败' },
      { status: 500 }
    )
  }
} 