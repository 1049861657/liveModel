'use client'

import React, { Suspense, useState, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { OrbitControls, Environment, useGLTF, useAnimations } from '@react-three/drei'
import { Group, AnimationClip } from 'three'
import { useSearchParams } from 'next/navigation'

// 动态导入 Canvas 以避免 SSR 问题
const Canvas = dynamic(
  () => import('@react-three/fiber').then((mod) => mod.Canvas),
  { ssr: false }
)

// 动画包装组件
function AnimatedModel({ 
  modelId, 
  onAnimationsFound,
  onAnimationAction,  // 添加动画控制回调
  onProgressUpdate,  // 修改进度更新回调类型
}: { 
  modelId: string
  onAnimationsFound: (names: string[]) => void
  onAnimationAction: (callback: (action: { type: 'play' | 'pause' | 'replay', name: string }) => void) => void 
  onProgressUpdate: (progress: { current: number, total: number }) => void  // 修改类型
}) {
  const group = useRef<Group>(null)
  const [currentAnimation, setCurrentAnimation] = useState<string>('')
  const modelPath = `/example/models/${modelId.toLowerCase()}.glb`
  
  // 预加载并缓存模型
  const model = useGLTF(modelPath)
  const { scene, animations = [] } = model
  const { actions = {}, mixer = null } = useAnimations(animations, group)

  // 在组件卸载时清理模型缓存
  useEffect(() => {
    return () => {
      useGLTF.clear(modelPath)
    }
  }, [modelPath])

  // 当模型或动画变化时更新
  React.useEffect(() => {
    // 确保组件已挂载
    let mounted = true

    const initializeModel = async () => {
      if (!scene || !mounted) return

      console.log('Model changed:', {
        modelId,
        scene: !!scene,
        animationsCount: animations?.length,
        actionsCount: Object.keys(actions).length
      })

      // 获取动画名称并通知父组件
      const animationNames = animations?.map((clip: AnimationClip) => clip.name) || []
      console.log('Available animations:', animationNames)
      onAnimationsFound(animationNames)

      // 如果有动画，播放第一个
      if (animationNames.length > 0) {
        const defaultAnimation = animationNames[0]
        const action = actions[defaultAnimation]
        if (action) {
          console.log('Playing default animation:', defaultAnimation)
          action.reset().fadeIn(0.5).play()
          setCurrentAnimation(defaultAnimation)
        }
      }
    }

    initializeModel()

    // 清理函数
    return () => {
      mounted = false
      if (mixer) {
        console.log('Cleaning up animations')
        mixer.stopAllAction()
      }
      setCurrentAnimation('')
    }
  }, [modelId, scene, animations, actions, mixer, onAnimationsFound])

  // 监听动画控制动作
  React.useEffect(() => {
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
            targetAction.reset().play()
            break
        }
      }
    }

    // 订阅动画控制事件
    onAnimationAction(handleAction)
  }, [actions, onAnimationAction])

  // 修改动画进度监听
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
      object={scene}  // 克隆场景以避免状态共享问题
      ref={group}
    />
  ) : null
}

interface DemoModel {
  id: string
  name: string
}

interface TestSceneProps {
  initialModels: DemoModel[]
  initialModelId?: string
}

export default function TestScene({ initialModels, initialModelId }: TestSceneProps) {
  const [selectedModel, setSelectedModel] = useState(initialModelId || 'shiba')
  const [availableAnimations, setAvailableAnimations] = useState<string[]>([])
  const [currentAnimation, setCurrentAnimation] = useState<string>('')
  const [isPlaying, setIsPlaying] = useState(true)
  const animationActionRef = useRef<((action: { type: 'play' | 'pause' | 'replay', name: string }) => void) | null>(null)
  const [progress, setProgress] = useState<{ current: number, total: number }>({ current: 0, total: 0 })

  // 格式化时间函数
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // 处理模型切换
  const handleModelChange = React.useCallback((modelId: string) => {
    console.log('Switching model to:', modelId)
    setSelectedModel(modelId)
    setAvailableAnimations([])  // 清空动画列表
    setCurrentAnimation('')     // 清空当前动画
    setIsPlaying(true)         // 重置播放状态
  }, [])

  // 处理动画列表更新
  const handleAnimationsFound = React.useCallback((names: string[]) => {
    setAvailableAnimations(names)
    if (names.length > 0) {
      setCurrentAnimation(names[0])
    }
  }, [])

  // 处理动画控制
  const handleAnimationControl = React.useCallback((type: 'play' | 'pause' | 'replay') => {
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
  const handleAnimationAction = React.useCallback((callback: (action: { type: 'play' | 'pause' | 'replay', name: string }) => void) => {
    animationActionRef.current = callback
  }, [])

  return (
    <div className="relative w-full h-screen bg-transparent">
      {/* 左侧模型选择 */}
      <div className="absolute top-6 left-6 z-10">
        <label className="block text-sm font-medium text-gray-700 mb-2">选择模型</label>
        <select 
          value={selectedModel}
          onChange={(e) => handleModelChange(e.target.value)}
          className="w-48 px-4 py-2 bg-white rounded-lg border border-gray-200 shadow-sm 
            focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
        >
          {initialModels.map(model => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </select>
      </div>

      {/* 右侧动画控制面板 */}
      {availableAnimations.length > 0 && (
        <div className="absolute top-6 right-6 z-10 w-72">
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100">
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">动画控制</h3>
              <p className="text-sm text-gray-500 mt-1">可用动画列表</p>
            </div>
            
            <div className="p-4 space-y-3">
              {availableAnimations.map((name) => (
                <div 
                  key={name}
                  className="p-3 rounded-lg bg-gray-50 border border-gray-100
                    hover:bg-gray-100 transition-colors"
                >
                  {name}
                </div>
              ))}
              
              {/* 播放控制按钮 */}
              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <button
                  onClick={() => handleAnimationControl(isPlaying ? 'pause' : 'play')}
                  className="flex-1 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 
                    text-white font-medium transition-colors"
                >
                  {isPlaying ? '暂停' : '播放'}
                </button>
                <button
                  onClick={() => handleAnimationControl('replay')}
                  className="flex-1 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 
                    text-gray-700 font-medium transition-colors"
                >
                  重播
                </button>
              </div>

              {/* 进度条 */}
              <div className="pt-3 border-t border-gray-100">
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-100"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm text-gray-500 mt-2 font-mono">
                  <span>{formatTime(progress.current)}</span>
                  <span>{formatTime(progress.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3D 场景 */}
      <Canvas
        camera={{ position: [0, 1.5, 3] }}
        gl={{ preserveDrawingBuffer: true }}
        className="bg-gradient-to-b from-gray-50 to-gray-100"
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <Suspense fallback={null}>
            <AnimatedModel 
              key={selectedModel}
              modelId={selectedModel} 
              onAnimationsFound={handleAnimationsFound}
              onAnimationAction={handleAnimationAction}
              onProgressUpdate={setProgress}
            />
          </Suspense>
          <OrbitControls 
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
          />
          <Environment preset="city" />
        </Suspense>
      </Canvas>
    </div>
  )
} 