'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import AuthForm from '@/components/ui/AuthForm'
import { motion } from 'motion/react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera} from '@react-three/drei'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/routing'

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const t = useTranslations('RegisterPage')

  async function onSubmit(data: { email: string; password: string; name: string }) {
    setLoading(true)
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || t('errors.registerFailed'))
      }

      toast.success(t('success.registerSuccess'))
      router.push('/login')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('errors.registerFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      {/* 背景动画 */}
      <div className="absolute inset-0 z-0">
        <Canvas>
          <PerspectiveCamera makeDefault position={[0, 0, 5]} />
          <OrbitControls 
            enableZoom={false}
            enablePan={false}
            autoRotate
            autoRotateSpeed={0.3}
          />
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <SphereMesh />
        </Canvas>
      </div>

      {/* 注册卡片 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-sm"
      >
        <div className="relative">
          {/* 背景装饰 */}
          <div className="absolute -inset-1">
            <div className="w-full h-full mx-auto rotate-180 opacity-30 blur-lg filter">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 rounded-xl" />
            </div>
          </div>

          {/* 主要内容 */}
          <div className="relative bg-white/90 backdrop-blur-xl p-6 rounded-xl shadow-xl">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center mb-6"
            >
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600">
                {t('title')}
              </h1>
              <p className="text-sm text-gray-500 mt-1">{t('subtitle')}</p>
            </motion.div>

            <AuthForm
              mode="register"
              onSubmit={onSubmit}
              loading={loading}
              linkHref="/login"
              linkText={t('form.loginLink')}
            />
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// 3D球体网格组件
function SphereMesh() {
  return (
    <mesh>
      <sphereGeometry args={[2, 32, 32]} />
      <meshStandardMaterial 
        color="#7c3aed"
        opacity={0.1}
        transparent
        wireframe
      />
    </mesh>
  )
} 