'use client'

import { useState, useEffect } from 'react'
import { DAEModel } from 'react-3d-viewer'

export default function DAE2Test() {
  const [width, setWidth] = useState(0)
  const [tick, setTick] = useState({ animate: true })
  const [lightPosition, setLightPosition] = useState({ x: 0, y: 0, z: 0 })

  // 计算容器尺寸
  useEffect(() => {
    setWidth(window.innerWidth - 500)
  }, [])

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      setTick({ animate: false })
    }
  }, [])

  // 光源动画
  useEffect(() => {
    function animate() {
      if (!tick.animate) return
      
      setLightPosition(prev => ({
        ...prev,
        z: prev.z + Math.sin(performance.now() * 0.0008)
      }))
      
      requestAnimationFrame(animate)
    }
    
    animate()
  }, [tick.animate])

  return (
    <div>
      <DAEModel
        src="/example/models/dae/Dragon 2.5_dae.dae"
        width={width}
        height={width}
        scale={{x:.5, y:.5, z:.5}}
        enableRotate={true}
        onLoad={() => {
          console.log('Model loaded')
        }}
      >
        <directionalLight position={[lightPosition.x, lightPosition.y, lightPosition.z]} />
      </DAEModel>
    </div>
  )
} 