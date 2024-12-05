'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Suspense, useEffect, useRef, useState, useCallback } from 'react'
import { ColladaLoader } from 'three/addons/loaders/ColladaLoader.js'
import * as THREE from 'three'
import { useSession } from 'next-auth/react'
import smdParser, { BoneData, Frame, AnimationInfo } from '@/utils/smdParser'

// 类型定义
interface Model {
  id: string
  name: string
  filePath: string
  componentName: string
  format: string
}

interface AnimationControl {
  isPlaying: boolean
  speed: number
  currentTime: number
  duration: number
  play: () => void
  pause: () => void
  stop: () => void
  setSpeed: (speed: number) => void
  setTime: (time: number) => void
}

interface Animation {
  id: string
  name: string
  filePath: string
}

// ModelScene 组件的完整实现
function ModelScene({ 
  onControlReady, 
  onAnimationInfo,
  currentAnimation,
  modelPath 
}: { 
  onControlReady: (control: AnimationControl) => void
  onAnimationInfo: (info: AnimationInfo) => void
  currentAnimation: string
  modelPath: string
}) {
  const [model, setModel] = useState<THREE.Group | null>(null)
  const [smdData, setSmdData] = useState<any>(null)
  const mixerRef = useRef<THREE.AnimationMixer | null>(null)
  const actionRef = useRef<THREE.AnimationAction | null>(null)
  const hasInitialized = useRef(false)
  const initialPoses = useRef(new Map())

  // 加载 SMD 文件
  useEffect(() => {
    if (!currentAnimation) return
    
    console.log('Loading animation:', currentAnimation)
    hasInitialized.current = false

    fetch(currentAnimation)
      .then(res => res.text())
      .then(text => {
        const data = smdParser.parse(text)
        
        // 使用文件名作为动画名称
        const animationInfo: AnimationInfo = {
          name: currentAnimation.replace('.smd', ''),
          duration: Number((data.frames.length / 30).toFixed(2)),
          frameCount: data.frames.length,
          boneCount: data.bones.length
        }
        
        onAnimationInfo(animationInfo)
        console.log('Animation Info:', animationInfo)

        // 转换为 Three.js 可用的动画数据
        const tracks: THREE.KeyframeTrack[] = []
        const fps = 30
        const scale = 1

        console.log('Converting SMD bones:', data.bones)
        data.bones.forEach((bone, index) => {
          console.log(`Processing bone ${index}:`, bone)
          const times: number[] = []
          const positions: number[] = []
          const rotations: number[] = []

          data.frames.forEach(frame => {
            const boneData = frame.bones.find(b => b.bone === bone.id)
            if (boneData) {
              times.push(frame.time / fps)

              // 位置数据
              positions.push(
                boneData.position.x * scale,
                boneData.position.y * scale,
                boneData.position.z * scale
              )

              // 旋转数据 - 转换为四元数
              const quat = new THREE.Quaternion()
              quat.setFromEuler(new THREE.Euler(
                boneData.rotation.x * THREE.MathUtils.DEG2RAD,
                boneData.rotation.y * THREE.MathUtils.DEG2RAD,
                boneData.rotation.z * THREE.MathUtils.DEG2RAD,
                'XYZ'
              ))
              rotations.push(quat.x, quat.y, quat.z, quat.w)
            }
          })

          if (times.length > 0) {
            // 添加位置轨道
            tracks.push(new THREE.VectorKeyframeTrack(
              `${bone.name}.position`,
              times,
              positions
            ))

            // 添加旋转轨道
            tracks.push(new THREE.QuaternionKeyframeTrack(
              `${bone.name}.quaternion`,
              times,
              rotations
            ))
          }
        })

        console.log('Created tracks:', tracks)
        setSmdData({
          bones: data.bones,
          frames: data.frames,
          tracks
        })
      })
      .catch(error => {
        console.error('Error loading SMD:', error)
      })
  }, [currentAnimation, onAnimationInfo])

  // 加载 DAE 模型
  useEffect(() => {
    console.log('Starting DAE load, smdData:', smdData)
    if (!smdData) {
      console.log('No SMD data yet, waiting...')
      return
    }

    const loadingManager = new THREE.LoadingManager(
      () => console.log('Loading complete!'),
      (url, itemsLoaded, itemsTotal) => {
        console.log(`Loading progress: ${url}, ${itemsLoaded}/${itemsTotal}`)
      },
      (url) => console.log(`Error loading: ${url}`)
    )

    const loader = new ColladaLoader(loadingManager)
    
    loader.load(
      modelPath,
      (collada) => {
        console.log('DAE loaded:', collada)
        if (hasInitialized.current) {
          console.log('Already initialized, skipping')
          return
        }

        const modelScene = new THREE.Group()
        modelScene.add(collada.scene)

        // 先找到 SkinnedMesh
        let skinnedMesh: THREE.SkinnedMesh | null = null
        modelScene.traverse((object) => {
          if (object instanceof THREE.SkinnedMesh) {
            console.log('Found SkinnedMesh:', object)
            skinnedMesh = object
          }
        })

        if (!skinnedMesh) {
          console.warn('No SkinnedMesh found, creating one...')
          // 如果没有 SkinnedMesh，我们需要创建一个
          modelScene.traverse((object) => {
            if (object instanceof THREE.Mesh) {
              const geometry = object.geometry
              const material = object.material
              
              // 创建骨骼
              const bones: THREE.Bone[] = smdData.bones.map((boneData: any) => {
                const bone = new THREE.Bone()
                bone.name = boneData.name
                return bone
              })

              // 设置骨骼层级
              smdData.bones.forEach((boneData: any, index: number) => {
                if (boneData.parent !== -1) {
                  bones[boneData.parent].add(bones[index])
                }
              })

              // 创建骨架
              const skeleton = new THREE.Skeleton(bones)

              // 创建 SkinnedMesh
              skinnedMesh = new THREE.SkinnedMesh(geometry, material)
              skinnedMesh.add(bones[0]) // 添加根骨骼
              skinnedMesh.bind(skeleton)

              // 替换原始 Mesh
              object.parent?.add(skinnedMesh)
              object.parent?.remove(object)
            }
          })
        }

        if (skinnedMesh && smdData) {
          console.log('Found bones in model:', skinnedMesh.skeleton.bones.map(b => b.name))
          console.log('Animation tracks targeting:', smdData.tracks.map(t => t.name))

          // 保存初始姿态
          skinnedMesh.skeleton.bones.forEach(bone => {
            initialPoses.current.set(bone.name, {
              position: bone.position.clone(),
              rotation: bone.quaternion.clone()
            })
          })
          
          const mixer = new THREE.AnimationMixer(skinnedMesh)
          mixerRef.current = mixer

          const clip = new THREE.AnimationClip('smd-animation', -1, smdData.tracks)
          const action = mixer.clipAction(clip)
          action.setEffectiveTimeScale(1)
          action.setEffectiveWeight(1)
          action.blendMode = THREE.AdditiveAnimationBlendMode
          
          // 添加动画重置逻辑
          action.reset = () => {
            skinnedMesh.skeleton.bones.forEach(bone => {
              const initial = initialPoses.current.get(bone.name)
              if (initial) {
                bone.position.copy(initial.position)
                bone.quaternion.copy(initial.rotation)
              }
            })
            skinnedMesh.skeleton.pose()
          }
          
          action.play()
          actionRef.current = action
        } else {
          console.warn('Could not create animation: missing SkinnedMesh or SMD data')
        }

        hasInitialized.current = true
        setModel(modelScene)
      },
      undefined,
      (error) => console.error('Error loading DAE:', error)
    )
  }, [modelPath, smdData])

  // 动画更新
  useEffect(() => {
    if (!mixerRef.current || !actionRef.current) return

    const clock = new THREE.Clock()
    let frameId: number

    const updateAnimation = () => {
      const delta = clock.getDelta()
      const mixer = mixerRef.current
      const action = actionRef.current
      
      if (mixer && action) {
        mixer.update(delta)
        
        onControlReady({
          isPlaying: action.isRunning(),
          speed: action.getEffectiveTimeScale(),
          currentTime: action.time,
          duration: action.getClip().duration,
          play: () => {
            action.paused = false
            action.play()
          },
          pause: () => {
            action.paused = true
          },
          stop: () => {
            action.stop()
            action.reset()
          },
          setSpeed: (speed) => {
            action.timeScale = speed
          },
          setTime: (time) => {
            action.time = time % action.getClip().duration
          }
        })
      }
      
      frameId = requestAnimationFrame(updateAnimation)
    }

    updateAnimation()
    return () => {
      if (frameId) cancelAnimationFrame(frameId)
    }
  }, [model, onControlReady])

  return model ? <primitive object={model} /> : null
}

export default function PreviewSMDTest() {
  const { data: session } = useSession()
  const [models, setModels] = useState<Model[]>([])
  const [currentModel, setCurrentModel] = useState<Model | null>(null)
  const [animationControl, setAnimationControl] = useState<AnimationControl | null>(null)
  const [animationInfo, setAnimationInfo] = useState<AnimationInfo | null>(null)
  const [availableAnimations, setAvailableAnimations] = useState<Animation[]>([])
  const [currentAnimation, setCurrentAnimation] = useState<string>('')

  // 加载用户的 DAE 模型列表
  useEffect(() => {
    if (session?.user?.id) {
      fetch('/api/models?format=dae&own=true')
        .then(res => res.json())
        .then(data => {
          setModels(data)
          if (data.length > 0) {
            setCurrentModel(data[0])
          }
        })
        .catch(error => {
          console.error('Failed to load models:', error)
        })
    }
  }, [session])

  // 加载动画列表
  useEffect(() => {
    if (currentModel) {
      fetch(`/api/models/${currentModel.id}/animations`)
        .then(res => res.json())
        .then((data: Animation[]) => {
          console.log('Loaded animations:', data)
          if (Array.isArray(data)) {
            setAvailableAnimations(data)
            if (data.length > 0) {
              // 使用完整的文件路径
              setCurrentAnimation(data[0].filePath)
            }
          } else {
            console.error('Invalid animations data:', data)
            setAvailableAnimations([])
          }
        })
        .catch(error => {
          console.error('Failed to load animations:', error)
          setAvailableAnimations([])
        })
    }
  }, [currentModel])

  if (!session) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-lg text-gray-600">请先登录</p>
      </div>
    )
  }

  return (
    <div className="h-screen w-full relative">
      <div className="absolute top-4 left-4 z-10 bg-white/80 backdrop-blur-sm p-4 rounded-lg shadow-lg">
        <div className="space-y-4">
          {/* 模型选择器 */}
          <div>
            <h3 className="text-sm font-semibold">选择模型</h3>
            <select
              value={currentModel?.id || ''}
              onChange={(e) => {
                const model = models.find(m => m.id === e.target.value)
                setCurrentModel(model || null)
                // 重置动画控制器
                if (animationControl) {
                  animationControl.stop()
                  setAnimationControl({
                    ...animationControl,
                    isPlaying: false,
                    currentTime: 0
                  })
                }
              }}
              className="mt-2 w-full px-3 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {models.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>

          {/* 动画选择器 */}
          <div>
            <h3 className="text-sm font-semibold">选择动画</h3>
            <select
              value={currentAnimation}
              onChange={(e) => {
                // 使用完整的文件路径
                const animation = availableAnimations.find(a => a.filePath === e.target.value)
                if (animation) {
                  setCurrentAnimation(animation.filePath)
                  if (animationControl) {
                    animationControl.stop()
                    setAnimationControl({
                      ...animationControl,
                      isPlaying: false,
                      currentTime: 0
                    })
                  }
                }
              }}
              className="mt-2 w-full px-3 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Array.isArray(availableAnimations) && availableAnimations.map(anim => (
                <option key={anim.id} value={anim.filePath}>
                  {anim.name}
                </option>
              ))}
            </select>
          </div>

          {/* 动画信息显示 */}
          <div>
            <h3 className="text-sm font-semibold">动画信息</h3>
            {animationInfo ? (
              <div className="mt-2 text-xs text-gray-600 space-y-1">
                <p>名称: {animationInfo.name}</p>
                <p>时长: {animationInfo.duration}s</p>
                <p>帧数: {animationInfo.frameCount}</p>
                <p>骨骼数: {animationInfo.boneCount}</p>
              </div>
            ) : (
              <div className="mt-2 text-xs text-gray-600">
                加载中...
              </div>
            )}
          </div>

          {/* 动画控制面板 */}
          <div>
            <h3 className="text-sm font-semibold">动画控制</h3>
            <div className="mt-2 space-y-2">
              {/* 播放控制按钮组 */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (animationControl) {
                      animationControl.play()
                      setAnimationControl({
                        ...animationControl,
                        isPlaying: true
                      })
                    }
                  }}
                  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                  disabled={!animationControl || animationControl.isPlaying}
                >
                  播放
                </button>
                <button
                  onClick={() => {
                    if (animationControl) {
                      animationControl.pause()
                      setAnimationControl({
                        ...animationControl,
                        isPlaying: false
                      })
                    }
                  }}
                  className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                  disabled={!animationControl || !animationControl.isPlaying}
                >
                  暂停
                </button>
                <button
                  onClick={() => {
                    if (animationControl) {
                      animationControl.stop()
                      setAnimationControl({
                        ...animationControl,
                        isPlaying: false,
                        currentTime: 0
                      })
                    }
                  }}
                  className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                  disabled={!animationControl}
                >
                  停止
                </button>
              </div>

              {/* 速度控制 */}
              <div className="space-y-1">
                <label className="text-xs text-gray-600">播放速度</label>
                <input
                  type="range"
                  min="0.1"
                  max="2"
                  step="0.1"
                  value={animationControl?.speed || 1}
                  onChange={(e) => animationControl?.setSpeed(parseFloat(e.target.value))}
                  className="w-full"
                  disabled={!animationControl}
                />
                <div className="text-xs text-gray-600">
                  {animationControl?.speed.toFixed(1)}x
                </div>
              </div>

              {/* 进度控制 */}
              <div className="space-y-1">
                <label className="text-xs text-gray-600">播放进度</label>
                <div className="relative w-full h-2 bg-gray-200 rounded">
                  <div 
                    className="absolute h-full bg-blue-500 rounded"
                    style={{ 
                      width: `${((animationControl?.currentTime || 0) / (animationControl?.duration || 1)) * 100}%` 
                    }}
                  />
                </div>
                <div className="text-xs text-gray-600">
                  {(animationControl?.currentTime || 0).toFixed(2)}s / {(animationControl?.duration || 0).toFixed(2)}s
                </div>
              </div>
            </div>
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
        <directionalLight position={[1, 1, 0]} intensity={2.5} />
        <Suspense fallback={null}>
          {currentModel && (
            <ModelScene 
              onControlReady={setAnimationControl} 
              onAnimationInfo={setAnimationInfo}
              currentAnimation={currentAnimation}
              modelPath={currentModel.filePath}
            />
          )}
        </Suspense>
        <OrbitControls target={[0, 3, 0]} enablePan={true} />
      </Canvas>
    </div>
  )
}
