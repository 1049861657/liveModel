'use client'

import { useSession } from 'next-auth/react'
import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface ProfileData {
  name: string
  email: string
  currentPassword?: string
  newPassword?: string
}

const profileSchema = z.object({
  name: z.string().min(2, '用户名至少2个字符'),
  email: z.string().email('邮箱格式不正确'),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, '新密码至少6个字符').optional(),
})

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession()
  const [loading, setLoading] = useState(false)
  const [isEditingPassword, setIsEditingPassword] = useState(false)
  const router = useRouter()
  const [avatarLoading, setAvatarLoading] = useState(false)

  // 如果没有 session，显示加载状态或重定向
  if (!session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">加载中...</p>
      </div>
    )
  }

  const { user } = session // 解构 user，这样 TypeScript 知道下面的代码中 user 一定存在

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)

    try {
      const formData = new FormData(event.currentTarget)
      const data: ProfileData = {
        name: formData.get('name') as string,
        email: user.email!, // 使用非空断言，因为我们已经检查过 session 存在
      }

      if (isEditingPassword) {
        data.currentPassword = formData.get('currentPassword') as string
        data.newPassword = formData.get('newPassword') as string
      }

      const result = profileSchema.safeParse(data)
      if (!result.success) {
        throw new Error(result.error.issues[0].message)
      }

      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }

      const updatedUser = await response.json()

      // 更新 session
      await updateSession({
        ...session,
        user: {
          ...user,
          name: updatedUser.name,
        },
      })

      // 强制更新 UI
      router.refresh()
      
      toast.success('个人资料更新成功')
      setIsEditingPassword(false)
    } catch (error) {
      console.error('Update error:', error)
      toast.error(error instanceof Error ? error.message : '更新失败')
    } finally {
      setLoading(false)
    }
  }

  // 添加头像上传处理函数
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setAvatarLoading(true)
      const formData = new FormData()
      formData.append('avatar', file)

      const response = await fetch('/api/upload/avatar', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '上传失败')
      }

      const { avatar } = await response.json()
      
      // 更新session中的头像
      await updateSession({
        ...session,
        user: {
          ...session?.user,
          avatar: avatar
        }
      })

      // 强制刷新页面以更新显示
      router.refresh()

      toast.success('头像更新成功')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '上传失败')
    } finally {
      setAvatarLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* 头部区域 */}
          <div className="px-8 py-6 bg-gradient-to-r from-blue-500 to-blue-600">
            <h1 className="text-2xl font-bold text-white">个人资料</h1>
            <p className="mt-1 text-blue-100">管理您的账号信息和安全设置</p>
          </div>

          {/* 表单区域 */}
          <form onSubmit={onSubmit} className="p-8">
            <div className="space-y-8">
              {/* 头像上传部分 */}
              <div className="flex flex-col items-center">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full overflow-hidden">
                    {user.avatar?.url ? (
                      <Image
                        src={user.avatar.url}
                        alt="头像"
                        width={96}
                        height={96}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      // 使用和导航栏一样的默认头像样式
                      <div className="w-full h-full flex items-center justify-center bg-[#6366f1] text-white text-3xl">
                        {user.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <label 
                    className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 
                             text-white opacity-0 group-hover:opacity-100 cursor-pointer rounded-full
                             transition-opacity duration-200"
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                      disabled={avatarLoading}
                    />
                    <span className="text-sm">
                      {avatarLoading ? '上传中...' : '更换头像'}
                    </span>
                  </label>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  点击更换头像图片
                </p>
              </div>

              {/* 基本信息部分 */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">基本信息</h3>
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      用户名
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      defaultValue={user.name || ''}
                      className="mt-1 block w-full px-4 py-3 rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      邮箱
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      defaultValue={user.email || ''}
                      disabled
                      className="mt-1 block w-full px-4 py-3 rounded-lg border border-gray-300 bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* 密码修改部分 */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">密码设置</h3>
                  <button
                    type="button"
                    onClick={() => setIsEditingPassword(!isEditingPassword)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium focus:outline-none focus:underline transition-colors"
                  >
                    {isEditingPassword ? '取消修改' : '修改密码'}
                  </button>
                </div>

                {isEditingPassword && (
                  <div className="space-y-6 bg-gray-50 p-6 rounded-lg">
                    <div>
                      <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                        当前密码
                      </label>
                      <input
                        type="password"
                        id="currentPassword"
                        name="currentPassword"
                        className="mt-1 block w-full px-4 py-3 rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        required={isEditingPassword}
                      />
                    </div>

                    <div>
                      <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                        新密码
                      </label>
                      <input
                        type="password"
                        id="newPassword"
                        name="newPassword"
                        className="mt-1 block w-full px-4 py-3 rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        required={isEditingPassword}
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        密码至少需要6个字符
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 提交按钮 */}
            <div className="mt-8">
              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors
                  ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    保存中...
                  </>
                ) : '保存修改'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
} 