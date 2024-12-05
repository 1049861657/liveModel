'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Suspense, useEffect, useRef, useState } from 'react'
import { ColladaLoader } from 'three/addons/loaders/ColladaLoader.js'
import * as THREE from 'three'

function ModelScene() {
  const [model, setModel] = useState<THREE.Group | null>(null)
  const clockRef = useRef<THREE.Clock>(new THREE.Clock())
  const hasInitialized = useRef(false)

  useEffect(() => {
    // 创建加载管理器
    const loadingManager = new THREE.LoadingManager(
      // onLoad
      () => {
        console.log('Loading complete!')
      },
      // onProgress
      (url, itemsLoaded, itemsTotal) => {
        console.log(`Loading file: ${url}. ${itemsLoaded}/${itemsTotal} files.`)
      },
      // onError
      (url) => {
        console.log(`Error loading file: ${url}`)
      }
    )

    const loader = new ColladaLoader(loadingManager)
    
    loader.load(
      '/example/models/dae/Wolf_One_dae.dae',
      (collada) => {
        if (hasInitialized.current) return

        const modelScene = collada.scene
        console.log('Model loaded:', modelScene)

        hasInitialized.current = true
        setModel(modelScene)
      },
      (xhr) => {
        const progress = (xhr.loaded / xhr.total * 100)
        console.log(progress + '% loaded')
      },
      (error) => {
        console.error('An error happened:', error)
      }
    )
  }, [])

  // 旋转动画
  useEffect(() => {
    if (!model) return

    let frameId: number

    const animate = () => {
      const delta = clockRef.current.getDelta()
      model.rotation.z += delta * 0.5 // 每秒旋转0.5弧度
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

export default function DAE5Test() {
  return (
    <div className="h-screen w-full relative">
      {/* 状态面板 - 只用于显示 */}
      <div className="absolute top-4 left-4 z-10 bg-white/80 backdrop-blur-sm p-4 rounded-lg shadow-lg">
        <div className="space-y-2">
          <div>
            <h3 className="text-sm font-semibold">动画说明</h3>
            <ul className="text-xs text-gray-600 list-disc pl-4 space-y-1">
              <li>使用简单的旋转动画</li>
              <li>每秒旋转0.5弧度</li>
              <li>使用 LoadingManager 管理加载</li>
              <li>不使用 AnimationMixer</li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold">与 DAE4 的区别</h3>
            <ul className="text-xs text-gray-600 list-disc pl-4 space-y-1">
              <li>DAE4: 使用模型自带动画</li>
              <li>DAE5: 使用代码控制旋转</li>
              <li>DAE4: 直接加载</li>
              <li>DAE5: 使用加载管理器</li>
            </ul>
          </div>
        </div>
      </div>

      <Canvas
        camera={{ 
          position: [8, 10, 8],
          fov: 45,
          near: 0.1,
          far: 2000
        }}
        shadows
      >
        <color attach="background" args={['#f0f0f0']} />
        
        {/* 环境光 */}
        <ambientLight intensity={1} />
        
        {/* 平行光 */}
        <directionalLight 
          position={[1, 1, 0]}
          intensity={2.5}
        />

        {/* 模型 */}
        <Suspense fallback={null}>
          <ModelScene />
        </Suspense>

        {/* 控制器 */}
        <OrbitControls 
          target={[0, 3, 0]}
          enablePan={true}
        />
      </Canvas>
    </div>
  )
} 