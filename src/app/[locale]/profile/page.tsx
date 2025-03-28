'use client'

import { useSession } from 'next-auth/react'
import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { z } from 'zod'
import { useRouter  } from '@/i18n/routing'
import Image from 'next/image'
import { useMutation } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'

interface ProfileData {
  name: string
  email: string
  currentPassword?: string
  newPassword?: string
}

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession()
  const [isEditingPassword, setIsEditingPassword] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const router = useRouter()
  const t = useTranslations('Profile')

  const profileSchema = z.object({
    name: z.string().min(2, t('validation.username')),
    email: z.string().email(t('validation.email')),
    currentPassword: z.string().optional(),
    newPassword: z.string().min(6, t('validation.password')).optional(),
  })

  // 使用 react-query 处理头像上传
  const avatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('avatar', file)
      const response = await fetch('/api/upload/avatar', {
        method: 'POST',
        body: formData
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || t('message.avatarError'))
      }
      return response.json()
    },
    onSuccess: async (data) => {
      await updateSession({
        ...session,
        user: {
          ...session?.user,
          avatar: data.avatar
        }
      })
      router.refresh()
      toast.success(t('message.avatarSuccess'))
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t('message.avatarError'))
    }
  })

  // 使用 react-query 处理个人资料更新
  const profileMutation = useMutation({
    mutationFn: async (data: ProfileData) => {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }
      return response.json()
    },
    onSuccess: async (data) => {
      await updateSession({
        ...session,
        user: {
          ...session?.user,
          name: data.name,
        },
      })
      router.refresh()
      toast.success(t('message.profileSuccess'))
      setIsEditingPassword(false)
    },
    onError: (error) => {
      console.error('Update error:', error)
      toast.error(error instanceof Error ? error.message : t('message.profileError'))
    }
  })

  // 如果没有 session，显示加载状态或重定向
  if (!session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">{t('message.loading')}</p>
      </div>
    )
  }

  const { user } = session

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    avatarMutation.mutate(file)
  }

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      const formData = new FormData(event.currentTarget)
      const data: ProfileData = {
        name: formData.get('name') as string,
        email: user.email!,
      }

      if (isEditingPassword) {
        data.currentPassword = formData.get('currentPassword') as string
        data.newPassword = formData.get('newPassword') as string
      }

      const result = profileSchema.safeParse(data)
      if (!result.success) {
        throw new Error(result.error.issues[0].message)
      }

      profileMutation.mutate(data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '更新失败')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* 头部区域 */}
          <div className="px-8 py-6 bg-gradient-to-r from-blue-500 to-blue-600">
            <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
            <p className="mt-1 text-blue-100">{t('subtitle')}</p>
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
                      disabled={avatarMutation.isPending}
                    />
                    <div className="min-w-[5rem] px-2 text-center">
                      <span className="text-sm whitespace-nowrap">
                        {avatarMutation.isPending ? t('avatar.uploading') : t('avatar.upload')}
                      </span>
                    </div>
                  </label>
                </div>
                <div className="mt-2 text-sm text-gray-500 max-w-[16rem] text-center mx-auto">
                  {t('avatar.tip')}
                </div>
              </div>

              {/* 基本信息部分 */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">{t('basicInfo.title')}</h3>
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      {t('basicInfo.username')}
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
                      {t('basicInfo.email')}
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
                  <h3 className="text-lg font-medium text-gray-900">{t('password.title')}</h3>
                  <button
                    type="button"
                    onClick={() => setIsEditingPassword(!isEditingPassword)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium focus:outline-none focus:underline transition-colors"
                  >
                    {isEditingPassword ? t('password.cancel') : t('password.edit')}
                  </button>
                </div>

                {isEditingPassword && (
                  <div className="space-y-6 bg-gray-50 p-6 rounded-lg">
                    <div>
                      <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                        {t('password.current')}
                      </label>
                      <div className="relative mt-1">
                        <input
                          type={showCurrentPassword ? "text" : "password"}
                          id="currentPassword"
                          name="currentPassword"
                          className="block w-full px-4 py-3 rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-12"
                          required={isEditingPassword}
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                        >
                          {showCurrentPassword ? (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                        {t('password.new')}
                      </label>
                      <div className="relative mt-1">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          id="newPassword"
                          name="newPassword"
                          className="block w-full px-4 py-3 rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-12"
                          required={isEditingPassword}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                        >
                          {showNewPassword ? (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          )}
                        </button>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        {t('password.requirement')}
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
                disabled={profileMutation.isPending}
                className={`w-full flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors
                  ${profileMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {profileMutation.isPending ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {t('button.saving')}
                  </>
                ) : t('button.save')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
} 