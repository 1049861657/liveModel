'use client'

import { useState, useRef, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'react-hot-toast'
import AuthForm from '@/components/ui/AuthForm'
import { motion } from 'motion/react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import type { RootState } from '@react-three/fiber/dist/declarations/src/core/store'
import { useTranslations } from 'next-intl'

// 动态粒子系统
function ParticleRing() {
  const count = 80
  const points = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2
    const radius = 3
    return [
      Math.cos(angle) * radius,
      Math.sin(angle) * radius,
      0
    ]
  })

  return (
    <points>
      <bufferGeometry>
        <float32BufferAttribute attach="attributes-position" count={points.length} array={new Float32Array(points.flat())} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={0.1}
        color="#4f46e5"
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  )
}

// 动态波浪效果
function WaveSphere() {
  const meshRef = useRef<THREE.Mesh>(null)
  const [time, setTime] = useState(0)

  useFrame((state: RootState) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.1
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.1
      setTime(state.clock.elapsedTime)
    }
  })

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[2, 64, 64]} />
      <shaderMaterial
        uniforms={{
          time: { value: time },
          color: { value: new THREE.Color("#4f46e5") }
        }}
        vertexShader={`
          varying vec2 vUv;
          varying float vDisplacement;
          uniform float time;
          
          void main() {
            vUv = uv;
            vec3 pos = position;
            pos.y += sin(pos.x * 2.0 + time) * 0.2;
            pos.x += cos(pos.y * 2.0 + time) * 0.2;
            vDisplacement = pos.y;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }
        `}
        fragmentShader={`
          uniform vec3 color;
          varying vec2 vUv;
          varying float vDisplacement;

          void main() {
            float alpha = smoothstep(0.0, 1.0, vDisplacement * 2.0 + 0.5);
            gl_FragColor = vec4(mix(color, color * 0.5, alpha), 0.5);
          }
        `}
        transparent
      />
    </mesh>
  )
}

// 发光环效果
function GlowRings() {
  const groupRef = useRef<THREE.Group>(null)
  
  useFrame((state: RootState) => {
    if (groupRef.current) {
      groupRef.current.rotation.z = state.clock.elapsedTime * 0.1
    }
  })

  return (
    <group ref={groupRef}>
      {[2.2, 2.6, 3].map((radius, i) => (
        <mesh key={i} rotation-x={Math.PI / 2}>
          <torusGeometry args={[radius, 0.02, 16, 100]} />
          <meshBasicMaterial
            color="#4f46e5"
            transparent
            opacity={0.3 - i * 0.1}
          />
        </mesh>
      ))}
    </group>
  )
}

// 主场景组件
function LoginScene() {
  return (
    <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 8], fov: 45 }}>
      <color attach="background" args={['#050816']} />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <Suspense fallback={null}>
        <WaveSphere />
        <GlowRings />
        <ParticleRing />
      </Suspense>
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.5}
        maxPolarAngle={Math.PI / 2}
        minPolarAngle={Math.PI / 2}
      />
      <EffectComposer>
        <Bloom
          intensity={1}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
        />
      </EffectComposer>
    </Canvas>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const t = useTranslations('LoginPage')

  // 获取回调URL，如果没有则默认为首页
  const callbackUrl = searchParams.get('callbackUrl') || '/'

  async function onSubmit(data: { email: string; password: string }) {
    setLoading(true)
    try {
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      })

      if (!result?.ok) {
        if (result?.error === 'CredentialsSignin') {
          toast.error(t('errors.invalidCredentials'))
        } else {
          toast.error(result?.error || t('errors.loginFailed'))
        }
      } else {
        toast.success(t('success.loginSuccess'))
        router.push(callbackUrl)
        router.refresh()
      }
    } catch (error) {
      console.error('Login error:', error)
      toast.error(t('errors.loginFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#050816]">
      {/* 背景动画 */}
      <div className="absolute inset-0 z-0">
        <LoginScene />
      </div>

      {/* 登录卡片 */}
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
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-xl" />
            </div>
          </div>

          {/* 主要内容 */}
          <div className="relative bg-white/10 backdrop-blur-xl p-6 rounded-xl shadow-xl border border-white/20">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center mb-6"
            >
              <h1 className="text-2xl font-bold text-white">
                {t('title')}
              </h1>
              <p className="text-sm text-gray-300 mt-1">{t('subtitle')}</p>
            </motion.div>

            <AuthForm
              mode="login"
              onSubmit={onSubmit}
              loading={loading}
              linkHref="/register"
              linkText={t('form.registerLink')}
            />
          </div>
        </div>
      </motion.div>
    </div>
  )
} 