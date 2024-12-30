'use client'

import { useEffect, useRef, useMemo } from 'react'
import { useFrame, RootState } from '@react-three/fiber'
import { Points, PointMaterial } from '@react-three/drei'
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'

function Stars(props: any) {
  const ref = useRef<THREE.Points>(null!)
  
  const [positions, colors] = useMemo(() => {
    const positions = new Float32Array(2000 * 3)
    const colors = new Float32Array(2000 * 3)
    
    for (let i = 0; i < 2000; i++) {
      const r = Math.random() * 2000
      const theta = 2 * Math.PI * Math.random()
      const phi = Math.acos(2 * Math.random() - 1)
      
      positions[i * 3] = r * Math.cos(theta) * Math.sin(phi)
      positions[i * 3 + 1] = r * Math.sin(theta) * Math.sin(phi)
      positions[i * 3 + 2] = r * Math.cos(phi)

      const color = new THREE.Color()
      color.setHSL(Math.random() * 0.1 + 0.6, 0.7, 0.4 + Math.random() * 0.2)
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }
    return [positions, colors]
  }, [])

  useFrame((_state: RootState, delta: number) => {
    ref.current.rotation.x -= delta / 30
    ref.current.rotation.y -= delta / 35
  })

  return (
    <group rotation={[0, 0, Math.PI / 4]}>
      <Points ref={ref} positions={positions} colors={colors} stride={3} frustumCulled={false} {...props}>
        <PointMaterial
          transparent
          vertexColors
          size={0.5}
          sizeAttenuation={true}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0.4}
        />
      </Points>
    </group>
  )
}

export default function AnimatedBackground() {
  return (
    <div className="absolute inset-0 -z-10 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-blue-100/30 to-purple-100/30" />
      <Canvas camera={{ position: [0, 0, 1], fov: 60 }}>
        <Stars />
      </Canvas>
    </div>
  )
} 