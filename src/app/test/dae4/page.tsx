'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Suspense, useEffect, useRef, useState } from 'react'
import { ColladaLoader } from 'three/addons/loaders/ColladaLoader.js'
import * as THREE from 'three'

function ModelScene() {
  const [model, setModel] = useState<THREE.Group | null>(null)
  const mixerRef = useRef<THREE.AnimationMixer | null>(null)
  const hasInitialized = useRef(false)

  useEffect(() => {
    const loader = new ColladaLoader()
    
    loader.load(
      '/example/models/dae/Wolf_dae.dae',
      (collada) => {
        if (hasInitialized.current) return

        const avatar = collada.scene
        const animations = avatar.animations

        // 打印详细的动画信息
        console.log('Collada:', collada)
        console.log('Scene:', avatar)
        console.log('Animations:', animations)
        if (animations) {
          animations.forEach((anim, index) => {
            console.log(`Animation ${index}:`, {
              name: anim.name,
              duration: anim.duration,
              tracks: anim.tracks
            })
          })
        }

        // 创建动画混合器
        const mixer = new THREE.AnimationMixer(avatar)
        mixerRef.current = mixer

        // 播放第一个动画
        if (animations && animations.length > 0) {
          const action = mixer.clipAction(animations[0])
          action.play()
        }

        hasInitialized.current = true
        setModel(avatar)
      },
      (xhr) => {
        const progress = (xhr.loaded / xhr.total * 100)
        console.log(progress + '% loaded')
      },
      (error) => {
        console.error('An error happened:', error)
      }
    )

    return () => {
      if (mixerRef.current) {
        mixerRef.current.stopAllAction()
      }
    }
  }, [])

  // 动画更新循环
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

export default function DAE4Test() {
  return (
    <div className="h-screen w-full relative">
      {/* 状态面板 - 只用于显示 */}
      <div className="absolute top-4 left-4 z-10 bg-white/80 backdrop-blur-sm p-4 rounded-lg shadow-lg">
        <div className="space-y-2">
          <div>
            <h3 className="text-sm font-semibold">动画状态</h3>
            <p className="text-xs text-gray-600">自动播放第一个动画</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold">实现说明</h3>
            <ul className="text-xs text-gray-600 list-disc pl-4 space-y-1">
              <li>使用官方示例实现方式</li>
              <li>从 scene.animations 获取动画</li>
              <li>使用 AnimationMixer 控制动画</li>
              <li>自动播放第一个动画</li>
            </ul>
          </div>
        </div>
      </div>

      <Canvas
        camera={{ 
          position: [15, 10, -15],
          fov: 25,
          near: 1,
          far: 1000
        }}
        shadows
      >
        <color attach="background" args={['#f0f0f0']} />
        <ambientLight intensity={0.6} />
        <directionalLight 
          position={[1.5, 1, -1.5]}
          intensity={3}
          castShadow
        />
        <gridHelper args={[10, 20, 0xc1c1c1, 0x8d8d8d]} />
        <Suspense fallback={null}>
          <ModelScene />
        </Suspense>
        <OrbitControls 
          enablePan={true}
          minDistance={5}
          maxDistance={40}
          target={[0, 2, 0]}
          screenSpacePanning={true}
        />
      </Canvas>
    </div>
  )
} 