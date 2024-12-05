'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Suspense, useEffect, useRef, useState } from 'react'
import { ColladaLoader } from 'three/addons/loaders/ColladaLoader.js'
import * as THREE from 'three'

function ModelScene() {
  const [model, setModel] = useState<THREE.Group | null>(null)
  const [textures, setTextures] = useState<string[]>([])
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
        // 收集贴图文件
        if (url.match(/\.(jpg|jpeg|png|gif|bmp)$/i)) {
          setTextures(prev => [...prev, url])
        }
      },
      // onError
      (url) => {
        console.log(`Error loading file: ${url}`)
      }
    )

    const loader = new ColladaLoader(loadingManager)
    
    loader.load(
      '/example/models/dae/ez801_1733207742083.dae',
      (collada) => {
        if (hasInitialized.current) return

        const modelScene = new THREE.Group()
        modelScene.add(collada.scene)

        // 打印材质信息
        console.log('Collada:', collada)
        console.log('Materials:', collada.library?.materials)
        console.log('Effects:', collada.library?.effects)
        console.log('Images:', collada.library?.images)

        // 遍历模型查找材质
        modelScene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            console.log('Mesh:', child.name)
            console.log('Material:', child.material)
            if (Array.isArray(child.material)) {
              child.material.forEach(mat => {
                console.log('- Material:', mat)
                if (mat.map) console.log('  Texture:', mat.map)
              })
            } else if (child.material.map) {
              console.log('Texture:', child.material.map)
            }
          }
        })

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

  if (!model) return null

  return <primitive object={model} />
}

export default function DAE6Test() {
  return (
    <div className="h-screen w-full relative">
      {/* 状态面板 - 显示贴图信息 */}
      <div className="absolute top-4 left-4 z-10 bg-white/80 backdrop-blur-sm p-4 rounded-lg shadow-lg">
        <div className="space-y-2">
          <div>
            <h3 className="text-sm font-semibold">材质和贴图说明</h3>
            <ul className="text-xs text-gray-600 list-disc pl-4 space-y-1">
              <li>ColladaLoader 自动加载贴图</li>
              <li>支持 diffuse, normal, specular 等贴图</li>
              <li>使用 LoadingManager 跟踪贴图加载</li>
              <li>查看控制台了解详细信息</li>
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
        <ambientLight intensity={1} />
        <directionalLight 
          position={[1, 1, 0]}
          intensity={2.5}
        />
        <Suspense fallback={null}>
          <ModelScene />
        </Suspense>
        <OrbitControls 
          target={[0, 3, 0]}
          enablePan={true}
        />
      </Canvas>
    </div>
  )
} 