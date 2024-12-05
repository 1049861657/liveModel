import React, { Suspense, useState, useRef, useCallback, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import * as Models from '../models'
import { modelList } from '../models'

export default function Scene() {
  const [selectedModel, setSelectedModel] = useState('shiba')
  const [currentAnimation, setCurrentAnimation] = useState('')
  const [availableAnimations, setAvailableAnimations] = useState([])
  const [isPlaying, setIsPlaying] = useState(true)
  const modelRef = useRef(null)

  const ModelComponent = Models[modelList.find(m => m.id === selectedModel)?.component]

  // 修改 useEffect，监听 selectedModel 变化
  useEffect(() => {
    // 重置动画状态
    setCurrentAnimation('')
    setAvailableAnimations([])
    
    // 延迟检查新模型的动画
    const checkAnimations = () => {
      const actions = modelRef.current?.actions
      console.log('Current actions:', actions)

      if (actions) {
        const animationNames = Object.keys(actions)
        console.log('Available animations:', animationNames)
        setAvailableAnimations(animationNames)
        
        // 只有在有动画的情况下才尝试播放
        if (animationNames.length > 0) {
          const mixamoAnimation = animationNames.find(name => name.includes('mixamo'))
          const defaultAnimation = mixamoAnimation || animationNames[0]
          
          console.log('Playing animation:', defaultAnimation)
          actions[defaultAnimation].reset().play()
          setCurrentAnimation(defaultAnimation)
        }
      }
    }

    // 给模型加载一些时间
    setTimeout(checkAnimations, 100)
  }, [selectedModel])

  const handleModelRef = useCallback((ref) => {
    console.log('Model ref updated:', ref)
    if (ref) {
      modelRef.current = ref
    }
  }, [])

  const handleModelChange = useCallback((modelId) => {
    // 停止当前动画
    if (currentAnimation && modelRef.current?.actions?.[currentAnimation]) {
      modelRef.current.actions[currentAnimation].stop()
    }
    setSelectedModel(modelId)
    modelRef.current = null
  }, [currentAnimation])

  const handleAnimationChange = useCallback((animationName) => {
    const actions = modelRef.current?.actions
    if (actions && actions[animationName]) {
      // 停止当前动画
      if (currentAnimation && actions[currentAnimation]) {
        actions[currentAnimation].stop()
      }
      // 播放新选择的动画
      console.log('Playing animation:', animationName)
      actions[animationName].reset().play()
      setCurrentAnimation(animationName)
      setIsPlaying(true)
    }
  }, [currentAnimation])

  const handlePlayPause = useCallback(() => {
    const actions = modelRef.current?.actions
    if (actions && currentAnimation) {
      const action = actions[currentAnimation]
      if (isPlaying) {
        action.paused = true
      } else {
        action.paused = false
      }
      setIsPlaying(!isPlaying)
    }
  }, [currentAnimation, isPlaying])

  const handleReplay = useCallback(() => {
    const actions = modelRef.current?.actions
    if (actions && currentAnimation) {
      const action = actions[currentAnimation]
      action.reset().play()
      setIsPlaying(true)
    }
  }, [currentAnimation])

  return (
    <div>
      {/* 左侧模型选择 */}
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 1000 }}>
        <select 
          value={selectedModel} 
          onChange={(e) => handleModelChange(e.target.value)}
          style={{
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #ccc'
          }}
        >
          {modelList.map(model => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </select>
      </div>

      {/* 右侧动画控制面板 */}
      <div style={{ 
        position: 'absolute', 
        top: 10, 
        right: 10, 
        zIndex: 1000,
        background: 'rgba(255, 255, 255, 0.9)',
        padding: '15px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ margin: '0 0 10px 0' }}>动画控制</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {availableAnimations.length > 0 ? (
            <>
              {availableAnimations.map((animName) => (
                <button
                  key={animName}
                  onClick={() => handleAnimationChange(animName)}
                  style={{
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                    background: currentAnimation === animName ? '#e0e0e0' : 'white',
                    cursor: 'pointer'
                  }}
                >
                  {animName}
                </button>
              ))}
              {/* 播放控制按钮组 */}
              {currentAnimation && (
                <div style={{ 
                  display: 'flex', 
                  gap: '8px', 
                  marginTop: '8px',
                  padding: '8px',
                  borderTop: '1px solid #eee'
                }}>
                  <button
                    onClick={handlePlayPause}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid #ccc',
                      background: '#f0f0f0',
                      cursor: 'pointer'
                    }}
                  >
                    {isPlaying ? '暂停' : '播放'}
                  </button>
                  <button
                    onClick={handleReplay}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid #ccc',
                      background: '#f0f0f0',
                      cursor: 'pointer'
                    }}
                  >
                    重播
                  </button>
                </div>
              )}
            </>
          ) : (
            <p style={{ color: '#666' }}>该模型没有动画</p>
          )}
        </div>
      </div>

      <div style={{ width: '100vw', height: '100vh' }}>
        <Canvas
          camera={{ position: [0, 1.5, 3] }}
          gl={{ preserveDrawingBuffer: true }}
        >
          <Suspense fallback={null}>
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            {ModelComponent && (
              <ModelComponent 
                position={[0, 0, 0]} 
                scale={1} 
                ref={handleModelRef}
              />
            )}
            <OrbitControls 
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
            />
            <Environment preset="city" />
          </Suspense>
        </Canvas>
      </div>
    </div>
  )
} 