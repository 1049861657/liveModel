import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const profileSchema = z.object({
  name: z.string().min(2, '用户名至少2个字符'),
  email: z.string().email('邮箱格式不正确'),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, '新密码至少6个字符').optional(),
})

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const result = profileSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { name, currentPassword, newPassword } = body

    // 如果只更新用户名
    if (!currentPassword && !newPassword) {
      const updatedUser = await prisma.user.update({
        where: { id: session.user.id },
        data: { name },
        select: {
          id: true,
          name: true,
          email: true,
        },
      })

      return NextResponse.json(updatedUser)
    }

    // 如果要修改密码
    if (currentPassword && newPassword) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id }
      })

      if (!user || !user.password) {
        return NextResponse.json(
          { error: '用户不存在' },
          { status: 400 }
        )
      }

      const isPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password
      )

      if (!isPasswordValid) {
        return NextResponse.json(
          { error: '当前密码错误' },
          { status: 400 }
        )
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10)
      const updatedUser = await prisma.user.update({
        where: { id: session.user.id },
        data: {
          name,
          password: hashedPassword,
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      })

      return NextResponse.json(updatedUser)
    }

    return NextResponse.json(
      { error: '无效的请求' },
      { status: 400 }
    )
  } catch (error) {
    console.error('更新个人资料失败:', error)
    return NextResponse.json(
      { error: '更新失败，请稍后重试' },
      { status: 500 }
    )
  }
} 