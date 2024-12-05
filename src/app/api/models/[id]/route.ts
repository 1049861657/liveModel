import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { unlink, rm } from 'fs/promises'
import path from 'path'
import { prisma } from '@/lib/db'

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
            name: true,
            email: true,
          }
        },
        _count: {
          select: {
            favorites: true,
            reviews: true
          }
        },
        textures: {
          select: {
            id: true,
            name: true,
            filePath: true,
            fileSize: true
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

    // 获取模型信息及其关联的贴图和动画
    const model = await prisma.model.findUnique({
      where: { id: params.id },
      include: {
        textures: true,
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

    // 删除模型文件
    const modelPath = path.join(
      process.cwd(),
      'public',
      model.filePath
    )

    // 如果是 GLB 文件，删除生成的组件文件
    const componentPath = model.format === 'glb' ? path.join(
      process.cwd(),
      'src',
      'models',
      `${model.componentName}.tsx`
    ) : null

    // 获取模型所在目录（用于删除贴图目录）
    const modelDir = path.dirname(modelPath)
    const texturesDir = path.join(modelDir, model.componentName, 'textures')
    
    // 获取动画所在目录（如果是 DAE 模型）
    const animationsDir = model.format === 'dae' 
      ? path.join(modelDir, 'smd')
      : null

    try {
      // 1. 删除模型文件
      await unlink(modelPath)

      // 2. 删除组件文件（如果存在）
      if (componentPath) {
        try {
          await unlink(componentPath)
        } catch (error) {
          console.error('删除组件文件失败:', error)
        }
      }

      // 3. 删除贴图目录（如果存在）
      if (model.textures.length > 0) {
        try {
          await rm(texturesDir, { recursive: true, force: true })
          // 如果贴图目录的父目录为空，也删除它
          const parentDir = path.dirname(texturesDir)
          await rm(parentDir, { recursive: true, force: true }).catch(() => {})
        } catch (error) {
          console.error('删除贴图目录失败:', error)
        }
      }

      // 4. 删除动画文件（如果存在）
      if (model.animations.length > 0 && animationsDir) {
        for (const animation of model.animations) {
          try {
            const animationPath = path.join(
              process.cwd(),
              'public',
              animation.filePath
            )
            await unlink(animationPath).catch(() => {})
          } catch (error) {
            console.error('删除动画文件失败:', error)
          }
        }
      }

    } catch (error) {
      console.error('删除文件失败:', error)
    }

    // 使用事务删除数据库记录
    await prisma.$transaction([
      // 删除动画记录
      prisma.animation.deleteMany({
        where: { modelId: params.id }
      }),
      // 删除贴图记录
      prisma.texture.deleteMany({
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