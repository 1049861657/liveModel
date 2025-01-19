'use client'

import React, { Suspense, useState, useRef, useCallback, useLayoutEffect, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { OrbitControls, Environment, useGLTF, useAnimations } from '@react-three/drei'
import { Group, AnimationClip, Box3, Vector3 } from 'three'
import * as THREE from 'three'
import Link from 'next/link'
import * as Select from '@radix-ui/react-select'
import { ChevronDownIcon, ChevronUpIcon, CheckIcon } from '@radix-ui/react-icons'

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
  onPartsCollected,
}: { 
  modelPath: string
  onAnimationsFound: (names: string[]) => void
  onAnimationAction: (callback: (action: { type: 'play' | 'pause' | 'stop', name: string, speed?: number }) => void) => void
  onProgressUpdate: (progress: { current: number, total: number }) => void
  onPartsCollected: (parts: { name: string; mesh: THREE.Mesh; visible: boolean }[]) => void
}) {
  const group = useRef<Group>(null)
  const { scene, animations = [] } = useGLTF(modelPath)
  const { actions, mixer } = useAnimations(animations, group)
  const [currentAnimation, setCurrentAnimation] = useState<string>('')

  // 模型自动缩放和居中
  useLayoutEffect(() => {
    if (!scene) return
    const box = new Box3().setFromObject(scene)
    const size = new Vector3()
    const center = new Vector3()
    box.getSize(size)
    box.getCenter(center)
    
    const maxDim = Math.max(size.x, size.y, size.z)
    const scale = 2 / maxDim
    
    scene.scale.setScalar(scale)
    scene.position.sub(center.multiplyScalar(scale))

    // 收集部件
    const newParts: { name: string; mesh: THREE.Mesh; visible: boolean }[] = []
    scene.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh) {
        newParts.push({
          name: child.name,
          mesh: child,
          visible: true
        })
      }
    })
    onPartsCollected(newParts)
  }, [scene])

  // 初始化动画
  useEffect(() => {
    if (!scene || !animations.length) return
    
    const animationNames = animations.map((clip: AnimationClip) => clip.name)
    onAnimationsFound(animationNames)

    // 自动播放第一个动画
    if (animationNames.length > 0) {
      const defaultAnimation = animationNames[0]
      Object.values(actions).forEach(action => action?.stop())
      const action = actions[defaultAnimation]
      if (action) {
        action.reset().fadeIn(0.5).play()
        setCurrentAnimation(defaultAnimation)
      }
    }

    return () => {
      mixer?.stopAllAction()
      setCurrentAnimation('')
    }
  }, [scene, animations, actions, mixer, onAnimationsFound])

  // 动画控制
  useEffect(() => {
    const handleAction = ({ type, name, speed }: { type: 'play' | 'pause' | 'stop', name: string, speed?: number }) => {
      const action = actions[name]
      if (!action) return

      switch (type) {
        case 'play':
          if (action.paused) {
            action.paused = false
          } else {
            action.reset()
            if (speed !== undefined) action.timeScale = speed
            action.play()
          }
          break
        case 'pause':
          action.paused = true
          break
        case 'stop':
          action.stop()
          action.reset()
          break
      }
      setCurrentAnimation(name)
    }

    onAnimationAction(handleAction)
  }, [actions, onAnimationAction])

  // 进度更新
  useEffect(() => {
    if (!mixer || !currentAnimation) return

    const updateProgress = () => {
      const action = actions[currentAnimation]
      if (action) {
        onProgressUpdate({
          current: action.time,
          total: action.getClip().duration
        })
      }
    }

    const interval = setInterval(updateProgress, 100)
    mixer.addEventListener('loop', updateProgress)
    mixer.addEventListener('finished', updateProgress)

    return () => {
      clearInterval(interval)
      mixer.removeEventListener('loop', updateProgress)
      mixer.removeEventListener('finished', updateProgress)
    }
  }, [mixer, actions, currentAnimation, onProgressUpdate])

  return scene ? <primitive object={scene} ref={group} /> : null
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
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [progress, setProgress] = useState<{ current: number, total: number }>({ current: 0, total: 0 })
  const [showAxes, setShowAxes] = useState(false)
  const [showGround, setShowGround] = useState(true)
  const [showParts, setShowParts] = useState(true)
  
  const controlsRef = useRef<any>(null)
  const modelRef = useRef<THREE.Group>(null)
  const animationActionRef = useRef<((action: { type: 'play' | 'pause' | 'stop', name: string, speed?: number }) => void) | null>(null)
  const initialCameraRef = useRef<{ position: THREE.Vector3, target: THREE.Vector3 }>()
  
  const [parts, setParts] = useState<{ name: string; mesh: THREE.Mesh; visible: boolean }[]>([])
  const [highlightedPart, setHighlightedPart] = useState<string>()
  const originalMaterials = useRef<Map<string, THREE.Material | THREE.Material[]>>(new Map())
  const [materialWarning, setMaterialWarning] = useState<string>('')
  const [showMaterialWarning, setShowMaterialWarning] = useState(true)

  // 判断是否显示右侧面板
  const shouldShowRightPanel = useCallback(() => {
    return availableAnimations.length > 0 || (showParts && parts.length > 0)
  }, [parts.length, showParts, availableAnimations.length])

  // 计算所有部件的选中状态
  const allPartsState = useMemo(() => {
    if (parts.length === 0) return { allSelected: false, allUnselected: false }
    const selectedCount = parts.filter(part => part.visible).length
    return {
      allSelected: selectedCount === parts.length,
      allUnselected: selectedCount === 0
    }
  }, [parts])

  // 相机控制优化
  useLayoutEffect(() => {
    if (!modelRef.current) return

    requestAnimationFrame(() => {
      const model = modelRef.current!
      const box = new THREE.Box3().setFromObject(model)
      const size = new THREE.Vector3()
      const center = new THREE.Vector3()
      
      box.getSize(size)
      box.getCenter(center)

      const maxDim = Math.max(size.x, size.y, size.z)
      const scale = 4 / maxDim
      
      model.scale.setScalar(scale)
      
      // 重新计算缩放后的包围盒
      const scaledBox = new THREE.Box3().setFromObject(model)
      const modelHeight = scaledBox.max.y - scaledBox.min.y
      
      model.position.set(
        -center.x * scale,
        -scaledBox.min.y,
        -center.z * scale
      )

      // 设置相机位置
      const cameraDistance = 8
      const cameraPosition = new THREE.Vector3(
        cameraDistance * Math.cos(Math.PI / 4),
        cameraDistance * 0.8,
        cameraDistance * Math.sin(Math.PI / 4)
      )
      const targetPosition = new THREE.Vector3(0, modelHeight * 0.3, 0)

      if (controlsRef.current) {
        const controls = controlsRef.current
        controls.object.position.copy(cameraPosition)
        controls.target.copy(targetPosition)
        
        controls.minDistance = 0.1
        controls.maxDistance = 100
        controls.minPolarAngle = Math.PI * 0.1
        controls.maxPolarAngle = Math.PI * 0.8
        
        controls.update()
      }

      initialCameraRef.current = {
        position: cameraPosition.clone(),
        target: targetPosition.clone()
      }
    })
  }, [modelRef.current])

  // 重置相机视角
  const resetCamera = useCallback(() => {
    if (!controlsRef.current || !initialCameraRef.current) return
    controlsRef.current.object.position.copy(initialCameraRef.current.position)
    controlsRef.current.target.copy(initialCameraRef.current.target)
    controlsRef.current.update()
  }, [])

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
      // 先停止当前动画
      animationActionRef.current({ type: 'stop', name: currentAnimation })
      // 然后播放新动画，使用当前的播放速度
      animationActionRef.current({ type: 'play', name: newAnimation, speed: playbackSpeed })
      setIsPlaying(true)
    }
  }, [currentAnimation, playbackSpeed])

  // 处理动画控制
  const handleAnimationControl = useCallback((type: 'play' | 'pause' | 'stop', speed?: number) => {
    if (currentAnimation && animationActionRef.current) {
      animationActionRef.current({ type, name: currentAnimation, speed })
      if (type === 'play') {
        setIsPlaying(true)
      } else if (type === 'pause') {
        setIsPlaying(false)
      } else if (type === 'stop') {
        setIsPlaying(false)
      }
    }
  }, [currentAnimation])

  // 处理动画动作回调
  const handleAnimationAction = useCallback((callback: (action: { type: 'play' | 'pause' | 'stop', name: string, speed?: number }) => void) => {
    animationActionRef.current = callback
  }, [])

  // 处理部件收集
  const handlePartsCollected = useCallback((newParts: { name: string; mesh: THREE.Mesh; visible: boolean }[]) => {
    newParts.forEach(part => {
      originalMaterials.current.set(part.name, part.mesh.material)
    })
    setParts(newParts)
  }, [])

  // 处理高亮效果
  useEffect(() => {
    if (!modelRef.current) return

    modelRef.current.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh) {
        const originalMaterial = originalMaterials.current.get(child.name)
        if (originalMaterial) {
          if (child.name === highlightedPart) {
            const highlightMaterial = new THREE.MeshPhongMaterial({
              color: new THREE.Color(0x00ff00),
              emissive: new THREE.Color(0x00ff00),
              emissiveIntensity: 0.5,
              transparent: true,
              opacity: 0.8
            })
            child.material = highlightMaterial
          } else {
            if (Array.isArray(originalMaterial)) {
              child.material = originalMaterial.map(mat => mat.clone())
            } else {
              child.material = originalMaterial.clone()
            }
          }
        }
      }
    })
  }, [highlightedPart])

  // 监听 GLTFLoader 警告
  useEffect(() => {
    const originalWarn = console.warn
    console.warn = (...args: any[]) => {
      const message = args.join(' ')
      if (message.includes('KHR_materials_pbrSpecularGlossiness')) {
        setMaterialWarning('模型使用了Three不支持的KHR材质扩展，贴图将不会被加载。')
      }
      originalWarn.apply(console, args)
    }

    return () => {
      console.warn = originalWarn
    }
  }, [])

  return (
    <div className="h-screen flex">
      {/* 左侧模型预览 */}
      <div className="flex-1 relative">
        {/* 顶部工具栏 */}
        <div className="absolute top-4 left-4 z-10 space-y-3">
          {/* 模型名称 */}
          <div className="inline-block bg-white/90 backdrop-blur-sm rounded-xl px-6 py-3 shadow-lg border border-white/20">
            <div className="flex items-center space-x-3">
              <svg 
                className="w-5 h-5 text-blue-500 flex-shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <h2 className="text-lg font-semibold text-gray-800">
                {initialModel.name}
              </h2>
            </div>
          </div>

          {/* 材质警告提示 */}
          {materialWarning && showMaterialWarning && (
            <div className="bg-yellow-500/90 backdrop-blur-sm text-white px-6 py-3 rounded-xl shadow-lg relative">
              <button
                onClick={() => setShowMaterialWarning(false)}
                className="absolute top-2 right-2 p-1 hover:bg-yellow-600/50 rounded-lg transition-colors"
                title="关闭提示"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="space-y-1">
                  <div className="font-medium">材质警告</div>
                  <div className="text-sm">{materialWarning}</div>
                  <div className="text-sm mt-2 flex items-center gap-4">
                    <Link href="/help?category=model&question=model-4" className="underline">
                      了解更多
                    </Link>
                    <div className="relative group">
                      <Link 
                        href={`/preview/${initialModel.id}?engine=gltf`} 
                        className="flex items-center gap-1 text-white hover:text-white/90"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                        <span>换为 Babylon 预览</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 右侧控制按钮组 */}
        <div className={`absolute top-4 z-10 flex flex-col gap-2 ${
          shouldShowRightPanel() 
            ? 'right-[18.5rem]' // 72px(面板宽度) + 2px(间距)
            : 'right-4'
        }`}>
          <button
            onClick={resetCamera}
            className="p-2 rounded-lg backdrop-blur-sm bg-white/80 text-gray-600 hover:bg-white/90 transition-colors"
            title="重置视角"
          >
            <svg 
              viewBox="0 0 24 24" 
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5M15 15l5.25 5.25" 
              />
            </svg>
          </button>

          <button
            onClick={() => setShowAxes(!showAxes)}
            className={`p-2 rounded-lg backdrop-blur-sm transition-colors ${
              showAxes 
                ? 'bg-blue-500 text-white' 
                : 'bg-white/80 text-gray-600 hover:bg-white/90'
            }`}
            title="显示/隐藏坐轴"
          >
            <svg 
              viewBox="0 0 24 24" 
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <g transform="translate(12, 12)">
                <line x1="0" y1="0" x2="8" y2="0" stroke="#E74C3C" strokeWidth="1.5" />
                <polygon 
                  points="7,-2 11,0 7,2" 
                  fill="#E74C3C" 
                  stroke="none"
                  transform="translate(-1, 0)"
                />
                <line x1="0" y1="0" x2="0" y2="-8" stroke="#2ECC71" strokeWidth="1.5" />
                <polygon 
                  points="-2,-7 0,-11 2,-7" 
                  fill="#2ECC71" 
                  stroke="none"
                  transform="translate(0, 1)"
                />
                <line 
                  x1="0" 
                  y1="0" 
                  x2="-5.66" 
                  y2="5.66" 
                  stroke="#3498DB" 
                  strokeWidth="1.5"
                />
                <polygon 
                  points="-4.24,-1.41 -7.07,7.07 -1.41,4.24" 
                  fill="#3498DB" 
                  stroke="none"
                  transform="translate(0.7, -0.7)"
                />
              </g>
            </svg>
          </button>

          <button
            onClick={() => setShowGround(!showGround)}
            className={`p-2 rounded-lg backdrop-blur-sm transition-colors ${
              showGround 
                ? 'bg-blue-500 text-white' 
                : 'bg-white/80 text-gray-600 hover:bg-white/90'
            }`}
            title="显示/隐藏网格地面"
          >
            <svg 
              viewBox="0 0 24 24" 
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 4v16h16" />
              <path d="M4 8h16" strokeWidth="1" />
              <path d="M4 12h16" strokeWidth="1" />
              <path d="M4 16h16" strokeWidth="1" />
              <path d="M8 4v16" strokeWidth="1" />
              <path d="M12 4v16" strokeWidth="1" />
              <path d="M16 4v16" strokeWidth="1" />
            </svg>
          </button>

          <button
            onClick={() => setShowParts(!showParts)}
            className={`p-2 rounded-lg backdrop-blur-sm transition-colors ${
              showParts 
                ? 'bg-blue-500 text-white' 
                : 'bg-white/80 text-gray-600 hover:bg-white/90'
            }`}
            title="显示/隐藏模型部件控制"
          >
            <svg 
              viewBox="0 0 24 24" 
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 5h16" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 19h16" />
              <circle cx="7" cy="5" r="1" fill="currentColor" />
              <circle cx="15" cy="12" r="1" fill="currentColor" />
              <circle cx="10" cy="19" r="1" fill="currentColor" />
            </svg>
          </button>
        </div>

        {/* 3D 场景 */}
        <Canvas
          camera={{ position: [0, 1.5, 3] }}
          gl={{ preserveDrawingBuffer: true }}
          style={{ background: '#f0f0f0' }}
        >
          <Suspense fallback={null}>
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <group ref={modelRef}>
              <AnimatedModel 
                modelPath={initialModel.filePath}
                onAnimationsFound={handleAnimationsFound}
                onAnimationAction={handleAnimationAction}
                onProgressUpdate={setProgress}
                onPartsCollected={handlePartsCollected}
              />
            </group>
            <OrbitControls 
              ref={controlsRef}
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
            />
            {showAxes && <axesHelper args={[10]} />}
            {showGround && (
              <group position={[0, 0, 0]}>
                <gridHelper args={[20, 20, '#888888', '#CCCCCC']} />
                <mesh 
                  rotation={[-Math.PI / 2, 0, 0]} 
                  position={[0, -0.01, 0]}
                >
                  <planeGeometry args={[20, 20]} />
                  <meshBasicMaterial 
                    color="#ffffff"
                    opacity={0.5}
                    transparent
                  />
                </mesh>
              </group>
            )}
            <Environment files="/hdr/buikslotermeerplein_1k.hdr" />
          </Suspense>
        </Canvas>
      </div>

      {/* 右侧信息面板 - 根据条件显示 */}
      {shouldShowRightPanel() && (
        <div className="w-72 bg-white/80 backdrop-blur-sm flex flex-col fixed top-0 bottom-0 right-0 z-10 overflow-hidden">
          <div className="absolute inset-0 flex flex-col">
            {/* 顶部留白 */}
            <div className="h-16 flex-shrink-0" />

            {/* 内容区域 - 可滚动 */}
            <div className="flex-1 overflow-y-auto min-h-0 pb-16">
              <div className="p-4 space-y-4">
                {/* 动画信息 */}
                {availableAnimations.length > 0 && (
                  <>
                    <div className="space-y-2">
                      <h3 className="font-bold">内置动画</h3>
                      <div className="text-sm space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">名称:</span>
                          <span className="text-gray-700 truncate max-w-[180px]" title={currentAnimation || 'default'}>
                            {currentAnimation || 'default'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">时长:</span>
                          <span className="text-gray-700">{formatTime(progress.total)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">帧数:</span>
                          <span className="text-gray-700">{Math.round(progress.total * 30)}</span>
                        </div>
                      </div>
                    </div>

                    {/* 动画控制器 */}
                    <div className="space-y-4">
                      <Select.Root value={currentAnimation} onValueChange={handleAnimationChange}>
                        <Select.Trigger 
                          className="inline-flex items-center justify-between w-full px-4 py-2.5 text-sm
                                     bg-white border border-gray-200 rounded-lg gap-2 outline-none
                                     hover:border-gray-300 focus:border-blue-500 focus:ring-2 
                                     focus:ring-blue-500/20 data-[placeholder]:text-gray-500"
                        >
                          <div className="truncate max-w-[200px]" title={currentAnimation || 'default'}>
                            <Select.Value placeholder="选择动画" />
                          </div>
                          <Select.Icon className="flex-shrink-0">
                            <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                          </Select.Icon>
                        </Select.Trigger>

                        <Select.Portal>
                          <Select.Content 
                            className="overflow-hidden bg-white rounded-lg border border-gray-200 shadow-lg z-[100] w-[var(--radix-select-trigger-width)]"
                            position="popper"
                            sideOffset={4}
                          >
                            <Select.ScrollUpButton className="flex items-center justify-center h-6 bg-gradient-to-b from-white to-white/80 text-gray-500 cursor-default sticky top-0 hover:bg-gray-50 transition-colors">
                              <ChevronUpIcon className="w-5 h-5" />
                            </Select.ScrollUpButton>
                            
                            <Select.Viewport className="p-1 max-h-[600px] overflow-y-auto relative">
                              {availableAnimations.map((name) => (
                                <Select.Item
                                  key={name}
                                  value={name}
                                  className="relative flex items-center px-6 py-2 text-sm rounded-md
                                           select-none data-[highlighted]:outline-none truncate
                                           data-[highlighted]:bg-blue-50 data-[state=checked]:font-medium
                                           cursor-pointer"
                                >
                                  <Select.ItemText>{name}</Select.ItemText>
                                  <Select.ItemIndicator className="absolute left-2 flex items-center justify-center">
                                    <CheckIcon className="w-4 h-4 text-blue-500" />
                                  </Select.ItemIndicator>
                                </Select.Item>
                              ))}
                            </Select.Viewport>

                            <Select.ScrollDownButton className="flex items-center justify-center h-6 bg-gradient-to-t from-white to-white/80 text-gray-500 cursor-default sticky bottom-0 hover:bg-gray-50 transition-colors border-t border-gray-100">
                              <ChevronDownIcon className="w-5 h-5" />
                              <div className="absolute -top-6 left-0 right-0 h-6 bg-gradient-to-b from-transparent to-white/50 pointer-events-none" />
                            </Select.ScrollDownButton>
                          </Select.Content>
                        </Select.Portal>
                      </Select.Root>

                      {/* 播放速度控制 */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-500">播放速度</span>
                          <span className="text-gray-700">{playbackSpeed}x</span>
                        </div>
                        <input
                          type="range"
                          min="0.1"
                          max="2"
                          step="0.1"
                          value={playbackSpeed}
                          onChange={(e) => {
                            const newSpeed = parseFloat(e.target.value)
                            setPlaybackSpeed(newSpeed)
                            handleAnimationControl('play', newSpeed)
                          }}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-gray-400">
                          <span>0.1x</span>
                          <span style={{ transform: 'translateX(-50%)', marginLeft: '0%' }}>1x</span>
                          <span>2x</span>
                        </div>
                      </div>

                      {/* 播放控制按钮 */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAnimationControl(isPlaying ? 'pause' : 'play')}
                          className="flex-1 px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                        >
                          <svg 
                            className="w-4 h-4" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2"
                          >
                            {isPlaying ? (
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 4h4v16H6zM14 4h4v16h-4z" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 9-14 9V3z" />
                            )}
                          </svg>
                          {isPlaying ? '暂停' : '播放'}
                        </button>
                        <button
                          onClick={() => handleAnimationControl('stop')}
                          className="flex-1 px-3 py-1.5 bg-red-500 text-white rounded hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                        >
                          <svg 
                            className="w-4 h-4" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2"
                          >
                            <rect x="4" y="4" width="16" height="16" rx="2" />
                          </svg>
                          停止
                        </button>
                      </div>

                      {/* 进度条 */}
                      <div className="space-y-1">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full transition-all"
                            style={{ width: `${(progress.current / progress.total) * 100}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>{formatTime(progress.current)}</span>
                          <span>{formatTime(progress.total)}</span>
                        </div>
                      </div>
                    </div>

                    {/* 分隔线 - 只在同时有动画和部件时显示 */}
                    {showParts && parts.length > 0 && (
                      <div className="border-t border-gray-200" />
                    )}
                  </>
                )}

                {/* 模型部件 */}
                {showParts && parts.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <h3 className="font-bold flex items-center gap-2">
                        <svg 
                          className="w-5 h-5 text-gray-600"
                          viewBox="0 0 24 24" 
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        模型部件 ({parts.length})
                      </h3>
                      
                      {/* 按钮组 */}
                      <div className="flex bg-gray-100 rounded-lg p-0.5">
                        <button
                          onClick={() => {
                            setParts(currentParts => 
                              currentParts.map(part => {
                                part.mesh.visible = true
                                return { ...part, visible: true }
                              })
                            )
                          }}
                          className={`px-2.5 py-1 text-xs rounded-l-md ${
                            allPartsState.allSelected 
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-500 text-white hover:bg-gray-600'
                          } transition-colors`}
                          title="显示所有部件"
                        >
                          全选
                        </button>
                        <button
                          onClick={() => {
                            setParts(currentParts => 
                              currentParts.map(part => {
                                part.mesh.visible = false
                                return { ...part, visible: false }
                              })
                            )
                          }}
                          className={`px-2.5 py-1 text-xs rounded-r-md ${
                            allPartsState.allUnselected
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-500 text-white hover:bg-gray-600'
                          } transition-colors`}
                          title="隐藏所有部件"
                        >
                          全不选
                        </button>
                      </div>
                    </div>

                    {/* 部件列表 */}
                    <div>
                      <ul className="space-y-1">
                        {parts.map((part, index) => (
                          <li 
                            key={index}
                            className={`flex items-center space-x-2 text-sm hover:bg-gray-50 rounded-lg p-1.5 transition-colors cursor-pointer ${
                              highlightedPart === part.name ? 'bg-gray-50' : ''
                            }`}
                            onMouseEnter={() => setHighlightedPart(part.name)}
                            onMouseLeave={() => setHighlightedPart(undefined)}
                            onClick={() => {
                              setParts(currentParts => 
                                currentParts.map((p, i) => {
                                  if (i === index) {
                                    p.mesh.visible = !p.visible
                                    return { ...p, visible: !p.visible }
                                  }
                                  return p
                                })
                              )
                            }}
                          >
                            {/* 显示/隐藏图标 */}
                            <div className={`p-1 rounded-md ${
                              part.visible 
                                ? 'text-blue-500' 
                                : 'text-gray-400'
                            }`}>
                              {part.visible ? (
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                                  <line x1="1" y1="1" x2="23" y2="23" />
                                </svg>
                              )}
                            </div>
                            <span className={part.visible ? 'text-gray-700' : 'text-gray-400'}>
                              {part.name}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// 格式化时间的辅助函数
function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
} 