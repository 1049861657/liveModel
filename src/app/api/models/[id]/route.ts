import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'
import path from 'path'
import { prisma } from '@/lib/db'
import { storageClient } from '@/lib/oss'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    const model = await prisma.model.findUnique({
      where: {
        id: params.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: {
              select: {
                url: true
              }
            }
          }
        },
        _count: {
          select: {
            favorites: true,
            reviews: true
          }
        },
        animations: {
          select: {
            id: true,
            name: true,
            filePath: true,
            fileSize: true
          }
        }
      }
    })

    if (!model) {
      return NextResponse.json(
        { error: '模型不存在' },
        { status: 404 }
      )
    }

    // 如果用户已登录，获取收藏状态
    let isFavorited = false
    if (session?.user?.id) {
      const favorite = await prisma.favorite.findUnique({
        where: {
          userId_modelId: {
            userId: session.user.id,
            modelId: params.id
          }
        }
      })
      isFavorited = !!favorite
    }

    return NextResponse.json({
      ...model,
      isFavorited
    })
  } catch (error) {
    console.error('获取模型失败:', error)
    return NextResponse.json(
      { error: '获取模型失败' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      )
    }

    // 获取模型信息及其关联的动画
    const model = await prisma.model.findUnique({
      where: { id: params.id },
      include: {
        animations: true
      }
    })

    if (!model) {
      return NextResponse.json(
        { error: '模型不存在' },
        { status: 404 }
      )
    }

    // 验证权限
    if (model.userId !== session.user.id) {
      return NextResponse.json(
        { error: '无权限删除此模型' },
        { status: 403 }
      )
    }

    try {
      // 直接删除模型的整个文件夹
      const modelFolderKey = `models/${model.format}/${model.componentName}/`
      await storageClient.delete(modelFolderKey)
    } catch (error) {
      console.error('删除OSS文件失败:', error)
      // 继续执行数据库删除操作
    }

    // 使用事务删除数据库记录
    await prisma.$transaction([
      // 删除动画记录
      prisma.animation.deleteMany({
        where: { modelId: params.id }
      }),
      // 删除收藏记录
      prisma.favorite.deleteMany({
        where: { modelId: params.id }
      }),
      // 删除评论和相关记录
      prisma.review.deleteMany({
        where: { modelId: params.id }
      }),
      // 最后删除模型记录
      prisma.model.delete({
        where: { id: params.id }
      })
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('删除模型失败:', error)
    return NextResponse.json(
      { error: '删除失败' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, isPublic, description } = body

    // 获取模型信息
    const model = await prisma.model.findUnique({
      where: { id: params.id }
    })

    if (!model) {
      return NextResponse.json(
        { error: '模型不存在' },
        { status: 404 }
      )
    }

    // 验证权限
    if (model.userId !== session.user.id) {
      return NextResponse.json(
        { error: '无权限修改此模型' },
        { status: 403 }
      )
    }

    // 更新模型信息
    const updatedModel = await prisma.model.update({
      where: { id: params.id },
      data: {
        name,
        isPublic,
        description,
      }
    })

    return NextResponse.json(updatedModel)
  } catch (error) {
    console.error('更新模型失败:', error)
    return NextResponse.json(
      { error: '更新失败' },
      { status: 500 }
    )
  }
} 