'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stage } from '@react-three/drei'
import { Suspense, useEffect, useState, useRef, useCallback } from 'react'
import { ColladaLoader } from 'three/addons/loaders/ColladaLoader.js'
import * as THREE from 'three'

interface Part {
  name: string
  mesh: THREE.Mesh
  visible: boolean
}

interface Animation {
  name: string
  duration: number
  isPlaying: boolean
  play: () => void
  stop: () => void
}

function ModelScene({ 
  onPartsFound,
  onAnimationsFound,
  highlightedPart 
}: { 
  onPartsFound: (parts: Part[]) => void
  onAnimationsFound: (animations: Animation[]) => void
  highlightedPart?: string
}) {
  const [model, setModel] = useState<THREE.Group | null>(null)
  const mixerRef = useRef<THREE.AnimationMixer | null>(null)
  const actionsRef = useRef<{ [key: string]: THREE.AnimationAction }>({})
  const hasInitialized = useRef(false)

  useEffect(() => {
    const loader = new ColladaLoader()
    
    loader.load(
      '/example/models/dae/efg009.dae',
      (collada) => {
        if (hasInitialized.current) return

        const scene = new THREE.Group()
        scene.add(collada.scene)
        
        // 创建动画混合器
        const mixer = new THREE.AnimationMixer(scene)
        mixerRef.current = mixer

        // 处理动画
        const animationList: Animation[] = []
        
        // 直接从 collada.animations 获取动画
        console.log('Collada data:', collada) // 调试日志

        // 检查并处理动画
        if (collada.kinematics?.clips) {
          Object.values(collada.kinematics.clips).forEach(clip => {
            if (clip instanceof THREE.AnimationClip) {
              const action = mixer.clipAction(clip)
              actionsRef.current[clip.name] = action
              
              animationList.push({
                name: clip.name,
                duration: clip.duration,
                isPlaying: false,
                play: () => {
                  action.reset().play()
                  const index = animationList.findIndex(a => a.name === clip.name)
                  if (index !== -1) {
                    animationList[index].isPlaying = true
                  }
                },
                stop: () => {
                  action.stop()
                  const index = animationList.findIndex(a => a.name === clip.name)
                  if (index !== -1) {
                    animationList[index].isPlaying = false
                  }
                }
              })
            }
          })
        }

        // 如果上面的方法没找到动画，尝试其他方式
        if (animationList.length === 0 && collada.scene.animations?.length > 0) {
          collada.scene.animations.forEach((clip: THREE.AnimationClip) => {
            const action = mixer.clipAction(clip)
            actionsRef.current[clip.name] = action
            
            animationList.push({
              name: clip.name,
              duration: clip.duration,
              isPlaying: false,
              play: () => {
                action.reset().play()
                const index = animationList.findIndex(a => a.name === clip.name)
                if (index !== -1) {
                  animationList[index].isPlaying = true
                }
              },
              stop: () => {
                action.stop()
                const index = animationList.findIndex(a => a.name === clip.name)
                if (index !== -1) {
                  animationList[index].isPlaying = false
                }
              }
            })
          })
        }

        if (animationList.length > 0) {
          onAnimationsFound(animationList)
          console.log('Found animations:', animationList)
        } else {
          console.warn('No animations found in the model')
        }

        // 收集部件
        const parts: Part[] = []
        scene.traverse((child: THREE.Object3D) => {
          if (child instanceof THREE.Mesh) {
            parts.push({
              name: child.name || `Part_${parts.length}`,
              mesh: child,
              visible: true
            })
          }
        })

        if (parts.length > 0) {
          onPartsFound(parts)
          console.log('Found parts:', parts)
        }

        // 自适应缩放和位置
        const box = new THREE.Box3().setFromObject(scene)
        const size = box.getSize(new THREE.Vector3())
        const center = box.getCenter(new THREE.Vector3())
        const maxDim = Math.max(size.x, size.y, size.z)
        const scale = 2 / maxDim

        scene.scale.setScalar(scale)
        scene.position.copy(center).multiplyScalar(-scale)
        scene.position.y -= size.y * scale / 2

        // 让加载器处理坐标系转换
        hasInitialized.current = true
        setModel(scene)
        console.log('Model loaded:', scene)
      },
      (xhr) => {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded')
      },
      (error) => {
        console.error('An error happened:', error)
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        })
      }
    )

    return () => {
      if (mixerRef.current) {
        mixerRef.current.stopAllAction()
      }
    }
  }, [onPartsFound, onAnimationsFound])

  // 动画更新
  useEffect(() => {
    if (!mixerRef.current) return

    const clock = new THREE.Clock()
    let frameId: number

    const animate = () => {
      const delta = clock.getDelta()
      mixerRef.current?.update(delta)
      frameId = requestAnimationFrame(animate)
    }

    animate()
    return () => {
      if (frameId) cancelAnimationFrame(frameId)
    }
  }, [model])

  if (!model) return null

  return <primitive object={model} />
}

export default function DAE3Test() {
  const [parts, setParts] = useState<Part[]>([])
  const [animations, setAnimations] = useState<Animation[]>([])
  const [highlightedPart, setHighlightedPart] = useState<string>()

  const handlePartsFound = useCallback((newParts: Part[]) => {
    setParts(newParts)
  }, [])

  const handleAnimationsFound = useCallback((newAnimations: Animation[]) => {
    setAnimations(newAnimations)
  }, [])

  // 添加动画控制函数
  const handlePlayAnimation = (animation: Animation) => {
    animation.play()
    setAnimations(prev => prev.map(a => 
      a.name === animation.name 
        ? { ...a, isPlaying: true }
        : a
    ))
  }

  const handleStopAnimation = (animation: Animation) => {
    animation.stop()
    setAnimations(prev => prev.map(a => 
      a.name === animation.name 
        ? { ...a, isPlaying: false }
        : a
    ))
  }

  return (
    <div className="h-screen w-full relative flex">
      {/* 左侧动画列表 */}
      <div className="w-64 bg-white/80 backdrop-blur-sm p-4 border-r border-gray-200">
        <h3 className="font-bold mb-4">动画列表: ({animations.length})</h3>
        <div className="space-y-2">
          {animations.map((anim, index) => (
            <div 
              key={index}
              className="p-2 bg-gray-50 rounded-lg"
            >
              <div className="font-medium">{anim.name}</div>
              <div className="text-sm text-gray-500">
                持续时间: {anim.duration.toFixed(2)}s
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => anim.isPlaying ? handleStopAnimation(anim) : handlePlayAnimation(anim)}
                  className={`px-3 py-1 rounded text-sm ${
                    anim.isPlaying 
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  {anim.isPlaying ? '停止' : '播放'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 中间 3D 视图 */}
      <div className="flex-1 relative">
        <Canvas
          camera={{ 
            position: [3, 2, 3],
            fov: 50,
            near: 0.1,
            far: 1000
          }}
          shadows
        >
          <color attach="background" args={['#f0f0f0']} />
          <ambientLight intensity={0.5} />
          <directionalLight
            position={[10, 10, 5]}
            intensity={1}
            castShadow
          />
          <Suspense fallback={null}>
            <Stage
              environment="city"
              intensity={0.6}
              adjustCamera={false}
            >
              <ModelScene 
                onPartsFound={handlePartsFound}
                onAnimationsFound={handleAnimationsFound}
                highlightedPart={highlightedPart}
              />
            </Stage>
          </Suspense>
          <OrbitControls 
            autoRotate
            autoRotateSpeed={0.5}
            enableZoom={true}
            enablePan={true}
            minDistance={1}
            maxDistance={20}
            target={[0, 0, 0]}
          />
        </Canvas>
      </div>

      {/* 右侧部件列表 */}
      <div className="w-72 bg-white/80 backdrop-blur-sm p-4">
        <h3 className="font-bold mb-4">模型部件: ({parts.length})</h3>
        <div className="max-h-[calc(100vh-8rem)] overflow-y-auto">
          <ul className="space-y-1">
            {parts.map((part, index) => (
              <li 
                key={index}
                className="flex items-center space-x-2 text-sm"
                onMouseEnter={() => setHighlightedPart(part.name)}
                onMouseLeave={() => setHighlightedPart(undefined)}
              >
                <span className="text-gray-700">
                  {part.name}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
} 