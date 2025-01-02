'use client'

import React, { Suspense, useState, useRef, useCallback, useLayoutEffect, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { OrbitControls, Environment, useGLTF, useAnimations } from '@react-three/drei'
import { Group, AnimationClip, Box3, Vector3 } from 'three'

// 动态导入 Canvas 以避免 SSR 问题
const Canvas = dynamic(
  () => import('@react-three/fiber').then((mod) => mod.Canvas),
  { ssr: false }
)

// 动画模型组件
function AnimatedModel({ 
  modelPath,
  onAnimationsFound,
  onAnimationAction,
  onProgressUpdate,
}: { 
  modelPath: string
  onAnimationsFound: (names: string[]) => void
  onAnimationAction: (callback: (action: { type: 'play' | 'pause' | 'replay', name: string }) => void) => void
  onProgressUpdate: (progress: { current: number, total: number }) => void
}) {
  const group = useRef<Group>(null)
  const [currentAnimation, setCurrentAnimation] = useState<string>('')
  const { scene, animations = [] } = useGLTF(modelPath)
  const { actions, mixer } = useAnimations(animations, group)

  // 使用 useLayoutEffect 来确保在渲染前调整大小
  useLayoutEffect(() => {
    if (scene) {
      const box = new Box3().setFromObject(scene)
      const size = new Vector3()
      box.getSize(size)
      
      const maxDim = Math.max(size.x, size.y, size.z)
      const scale = 2 / maxDim
      scene.scale.setScalar(scale)

      const center = new Vector3()
      box.getCenter(center)
      scene.position.sub(center.multiplyScalar(scale))
    }
  }, [scene])

  // 当模型或动画变化时更新
  useEffect(() => {
    let mounted = true

    const initializeModel = async () => {
      if (!scene || !mounted) return

      // 获取动画名称并通知父组件
      const animationNames = animations?.map((clip: AnimationClip) => clip.name) || []
      onAnimationsFound(animationNames)

      // 如果有动画，播放第一个
      if (animationNames.length > 0) {
        const defaultAnimation = animationNames[0]
        const action = actions[defaultAnimation]
        if (action) {
          // 停止所有动画
          Object.values(actions).forEach(action => action?.stop())
          action.reset().fadeIn(0.5).play()
          setCurrentAnimation(defaultAnimation)
        }
      }
    }

    initializeModel()

    return () => {
      mounted = false
      if (mixer) {
        mixer.stopAllAction()
      }
      setCurrentAnimation('')
    }
  }, [modelPath, scene, animations, actions, mixer, onAnimationsFound])

  // 监听动画控制动作
  useEffect(() => {
    const handleAction = (action: { type: 'play' | 'pause' | 'replay', name: string }) => {
      const targetAction = actions[action.name]
      if (targetAction) {
        switch (action.type) {
          case 'play':
            targetAction.paused = false
            break
          case 'pause':
            targetAction.paused = true
            break
          case 'replay':
            // 先停止所有动画
            Object.values(actions).forEach(a => a?.stop())
            targetAction.reset().fadeIn(0.5).play()
            break
        }
        setCurrentAnimation(action.name)
      }
    }

    onAnimationAction(handleAction)
  }, [actions, onAnimationAction])

  // 更新进度
  React.useEffect(() => {
    if (mixer) {
      const updateProgress = () => {
        const currentAction = actions[currentAnimation]
        if (currentAction) {
          const currentTime = currentAction.time
          const totalTime = currentAction.getClip().duration
          onProgressUpdate({ current: currentTime, total: totalTime })
        }
      }

      mixer.addEventListener('loop', updateProgress)
      mixer.addEventListener('finished', updateProgress)

      const interval = setInterval(updateProgress, 100)

      return () => {
        mixer.removeEventListener('loop', updateProgress)
        mixer.removeEventListener('finished', updateProgress)
        clearInterval(interval)
      }
    }
  }, [mixer, actions, currentAnimation, onProgressUpdate])

  return scene ? (
    <primitive 
      object={scene}
      ref={group}
    />
  ) : null
}

interface PreviewSceneProps {
  initialModel: {
    id: string
    name: string
    filePath: string
    user: {
      name: string | null
      email: string
    }
  }
}

export default function PreviewScene({ initialModel }: PreviewSceneProps) {
  const [availableAnimations, setAvailableAnimations] = useState<string[]>([])
  const [currentAnimation, setCurrentAnimation] = useState<string>('')
  const [isPlaying, setIsPlaying] = useState(true)
  const animationActionRef = useRef<((action: { type: 'play' | 'pause' | 'replay', name: string }) => void) | null>(null)
  const [progress, setProgress] = useState<{ current: number, total: number }>({ current: 0, total: 0 })

  // 处理动画列表更新
  const handleAnimationsFound = useCallback((names: string[]) => {
    setAvailableAnimations(names)
    if (names.length > 0) {
      setCurrentAnimation(names[0])
    }
  }, [])

  // 处理动画切换
  const handleAnimationChange = useCallback((newAnimation: string) => {
    setCurrentAnimation(newAnimation)
    if (animationActionRef.current) {
      animationActionRef.current({ type: 'replay', name: newAnimation })
      setIsPlaying(true)
    }
  }, [])

  // 处理动画控制
  const handleAnimationControl = useCallback((type: 'play' | 'pause' | 'replay') => {
    if (currentAnimation && animationActionRef.current) {
      animationActionRef.current({ type, name: currentAnimation })
      if (type === 'play' || type === 'replay') {
        setIsPlaying(true)
      } else if (type === 'pause') {
        setIsPlaying(false)
      }
    }
  }, [currentAnimation])

  // 处理动画动作回调
  const handleAnimationAction = useCallback((callback: (action: { type: 'play' | 'pause' | 'replay', name: string }) => void) => {
    animationActionRef.current = callback
  }, [])

  return (
    <div className="relative w-full h-screen">
      {/* 控制面板 */}
      <div className="absolute top-6 left-6 z-10 bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-lg">
        <h2 className="text-xl font-semibold">{initialModel.name}</h2>
        {availableAnimations.length > 0 && (
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                动画控制
              </label>
              <select
                value={currentAnimation}
                onChange={(e) => handleAnimationChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {availableAnimations.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              {/* 播放控制按钮 */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleAnimationControl(isPlaying ? 'pause' : 'play')}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                  {isPlaying ? '暂停' : '播放'}
                </button>
                <button
                  onClick={() => handleAnimationControl('replay')}
                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                >
                  重播
                </button>
              </div>

              {/* 进度条 */}
              <div className="space-y-1">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-blue-500 h-2.5 rounded-full transition-all"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>{formatTime(progress.current)}</span>
                  <span>{formatTime(progress.total)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3D 场景 */}
      <Canvas
        camera={{ position: [0, 1.5, 3] }}
        gl={{ preserveDrawingBuffer: true }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <AnimatedModel 
            modelPath={initialModel.filePath}
            onAnimationsFound={handleAnimationsFound}
            onAnimationAction={handleAnimationAction}
            onProgressUpdate={setProgress}
          />
          <OrbitControls 
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
          />
          <Environment files="/hdr/meadow_2_4k.hdr" />
        </Suspense>
      </Canvas>
    </div>
  )
}

// 格式化时间的辅助函数
function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
} 