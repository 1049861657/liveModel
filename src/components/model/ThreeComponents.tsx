'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, useGLTF, useAnimations } from '@react-three/drei'
import { Group } from 'three'
import { useRef, useEffect } from 'react'

// 导出接口定义
export interface ThreeComponentsProps {
  modelId: string
}

// 动画模型组件
function AnimatedModel({ modelId }: { modelId: string }) {
  const group = useRef<Group>(null)
  const modelPath = `/example/models/${modelId.toLowerCase()}.glb`
  
  const { scene, animations = [] } = useGLTF(modelPath)
  const { actions, mixer } = useAnimations(animations, group)

  useEffect(() => {
    return () => {
      useGLTF.clear(modelPath)
    }
  }, [modelPath])

  useEffect(() => {
    if (animations.length > 0 && actions) {
      const firstAnimation = Object.keys(actions)[0]
      const action = actions[firstAnimation]
      if (action) {
        action.reset().fadeIn(0.5).play()
      }
    }
  }, [actions, animations])

  return scene ? (
    <primitive 
      object={scene}
      ref={group}
    />
  ) : null
}

// 使用导出的接口
export default function ThreeComponents({ modelId }: ThreeComponentsProps) {
  return (
    <Canvas
      camera={{ position: [0, 1.5, 3] }}
      gl={{ preserveDrawingBuffer: true }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <AnimatedModel modelId={modelId} />
      <OrbitControls 
        enablePan={false}
        enableZoom={true}
        enableRotate={true}
        minPolarAngle={Math.PI/4}
        maxPolarAngle={Math.PI/1.5}
      />
      <Environment preset="city" />
    </Canvas>
  )
} 