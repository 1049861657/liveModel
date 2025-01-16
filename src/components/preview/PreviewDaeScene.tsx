'use client'

import { useEffect, useRef, useState, useCallback, useLayoutEffect, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import * as THREE from 'three'
import { ColladaLoader,Collada } from 'three/examples/jsm/loaders/ColladaLoader.js'
import smdParser, {AnimationInfo, BoneData, Frame } from '@/utils/smdParser'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { toast } from 'react-hot-toast'
import Link from 'next/link'
import { type ExtendedModel } from '@/types/model'

interface Part {
  name: string
  mesh: THREE.Mesh
  visible: boolean
}

interface PreviewDaeSceneProps {
  initialModel: ExtendedModel
}

// 格式化时间的辅助函数
function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function ModelScene({ initialModel }: PreviewDaeSceneProps) {
  const sceneRef = useRef<THREE.Group>(null)
  const originalMaterials = useRef<Map<string, THREE.Material | THREE.Material[]>>(new Map())
  const controlsRef = useRef<any>(null)
  const loadingManagerRef = useRef<THREE.LoadingManager | null>(null)
  const [model, setModel] = useState<THREE.Group | null>(null)
  const [parts, setParts] = useState<Part[]>([])
  const [highlightedPart, setHighlightedPart] = useState<string>()
  const [skinnedMesh, setSkinnedMesh] = useState<THREE.SkinnedMesh | null>(null)

  // 动画相关状态
  const [animationMixer, setAnimationMixer] = useState<THREE.AnimationMixer | null>(null)
  const [animationClip, setAnimationClip] = useState<THREE.AnimationClip | null>(null)
  const [currentAction, setCurrentAction] = useState<THREE.AnimationAction | null>(null)
  const [animationInfo, setAnimationInfo] = useState<AnimationInfo | null>(null)
  
  // 加载状态
  const [isLoadingAnimation, setIsLoadingAnimation] = useState(false)
  const [animationError, setAnimationError] = useState<string | null>(null)

  // 动画列表状态
  const [animations, setAnimations] = useState<{
    id: string
    name: string
    filePath: string
  }[]>(initialModel.animations || [])
  const [selectedAnimation, setSelectedAnimation] = useState<string>()

  // 内置动画状态
  const [builtInAnimations, setBuiltInAnimations] = useState<THREE.AnimationClip[]>([])

  // 动画控制状态
  const [animationControl, setAnimationControl] = useState<{
    isPlaying: boolean
    speed: number
    currentTime: number
    duration: number
    play: () => void
    pause: () => void
    stop: () => void
    setSpeed: (speed: number) => void
    setTime: (time: number) => void
  } | null>(null)

  // 显示控制状态
  const [showAxes, setShowAxes] = useState(false)
  const [showGround, setShowGround] = useState(true)

  // 添加相机初始状态
  const initialCameraRef = useRef<{
    position: THREE.Vector3
    target: THREE.Vector3
  }>()

  // 添加状态
  const [showSMDList, setShowSMDList] = useState(false)
  const [showParts, setShowParts] = useState(true)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [animationToDelete, setAnimationToDelete] = useState<{id: string, name: string} | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [textureErrors, setTextureErrors] = useState<string[]>([])

  // 添加新的状态
  const [currentAnimation, setCurrentAnimation] = useState<string>('')
  const [availableAnimations, setAvailableAnimations] = useState<string[]>([])

  // 在加载模型时设置可用动画
  useEffect(() => {
    if (builtInAnimations.length > 0) {
      const names = builtInAnimations.map(clip => clip.name)
      setAvailableAnimations(names)
      if (names.length > 0) {
        setCurrentAnimation(names[0])
      }
    }
  }, [builtInAnimations])

  // 初始化 LoadingManager
  useEffect(() => {
    if (!loadingManagerRef.current) {
      loadingManagerRef.current = new THREE.LoadingManager(
        // onLoad
        () => {
          console.log('Loading complete!')
        },
        // onProgress
        (url, itemsLoaded, itemsTotal) => {
          console.log('Loading:', {
            url,
            current: itemsLoaded,
            total: itemsTotal,
            progress: `${(itemsLoaded / itemsTotal * 100).toFixed(2)}%`
          })
        },
        // onError
        (url) => {
          console.error('Error loading:', url)
          // 只处理贴图加载错误
          if (url.match(/\.(png|jpe?g|gif|bmp|dds|tga)$/i)) {
            setTextureErrors(prev => [...new Set([...prev, url.split('/').pop() || url])])
          }
        }
      )
    }

    return () => {
      loadingManagerRef.current = null
      setTextureErrors([])
    }
  }, [])

  // 加载模型
  useEffect(() => {
    if (!loadingManagerRef.current) return

    const loader = new ColladaLoader(loadingManagerRef.current)
    
    console.log('Starting load for:', initialModel.filePath)

    loader.load(
      initialModel.filePath,
      (collada: Collada) => {
        console.log('Collada loaded:', collada)
        const loadedModel = new THREE.Group()
        const scene = collada.scene as unknown as THREE.Group

        // 确保正确处理材质和贴图
        scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            if (Array.isArray(child.material)) {
              child.material.forEach(mat => {
                if (mat.map) {
                  mat.map.needsUpdate = true
                }
                mat.needsUpdate = true
              })
            } else {
              if (child.material.map) {
                child.material.map.needsUpdate = true
              }
              child.material.needsUpdate = true
            }
          }
        })

        // 查找并设置 SkinnedMesh
        scene.traverse((child) => {
          if (child instanceof THREE.SkinnedMesh) {
            setSkinnedMesh(child)
          }
        })

        loadedModel.add(scene)
        setModel(loadedModel)

        // 处理内置动画
        if (collada.scene.animations && collada.scene.animations.length > 0) {
          setBuiltInAnimations(collada.scene.animations)
          
          // 创建动画混合器
          const mixer = new THREE.AnimationMixer(scene)
          setAnimationMixer(mixer)

          // 自动播放第一个动画
          const action = mixer.clipAction(collada.scene.animations[0])
          action.play()
          setCurrentAction(action)
          
          // 设置动画信息
          const firstAnim = collada.scene.animations[0]
          setAnimationInfo({
            name: firstAnim.name || '默认动画',
            duration: firstAnim.duration,
            frameCount: Math.floor(firstAnim.duration * 30), // 假设30fps
            boneCount: 0 // 内置动画不需要显示骨骼数
          })
          setAnimationClip(firstAnim)
        }

        // 收集部件数组
        const newParts: Part[] = []
        scene.traverse((child: THREE.Object3D) => {
          if (child instanceof THREE.Mesh) {
            originalMaterials.current.set(child.name, child.material)
            newParts.push({
              name: child.name,
              mesh: child,
              visible: true
            })
          }
        })

        setParts(newParts)
      },
      // onProgress
      (xhr) => {
        console.log(`Loading model: ${(xhr.loaded / xhr.total * 100).toFixed(2)}%`)
      },
      (error) => {
        console.error('Model loading error:', error)
      }
    )
  }, [initialModel.filePath])

  // 修改 SMD 动画加载部分
  useEffect(() => {
    if (!selectedAnimation || !skinnedMesh) return
    
    // 找到选中的动画文件
    const selectedAnimFile = animations.find(anim => anim.id === selectedAnimation)
    if (!selectedAnimFile) {
      console.error('未找到选中的动画文件')
      return
    }

    setIsLoadingAnimation(true)
    console.log('Loading animation:', selectedAnimFile.filePath)

    fetch(selectedAnimFile.filePath)
      .then(res => res.text())
      .then(text => {
        const data = smdParser.parse(text)
        
        // 使用动画名称
        const animationInfo: AnimationInfo = {
          name: selectedAnimFile.name,
          duration: Number((data.frames.length / 30).toFixed(2)),
          frameCount: data.frames.length,
          boneCount: data.bones.length
        }
        
        setAnimationInfo(animationInfo)
        console.log('Animation Info:', animationInfo)

        // 转换为 Three.js 可用的动画数据
        const tracks: THREE.KeyframeTrack[] = []
        const fps = 30
        const scale = 1

        console.log('Converting SMD bones:', data.bones)
        data.bones.forEach((bone: any, index: number) => {
          console.log(`Processing bone ${index}:`, bone)
          const times: number[] = []
          const positions: number[] = []
          const rotations: number[] = []

          data.frames.forEach((frame: Frame) => {
            const boneData = frame.bones.find((b: BoneData) => b.bone === bone.id)
            if (boneData) {
              times.push(frame.time / fps)

              positions.push(
                boneData.position.x * scale,
                boneData.position.y * scale,
                boneData.position.z * scale
              )

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
            tracks.push(new THREE.VectorKeyframeTrack(
              `${bone.name}.position`,
              times,
              positions
            ))

            tracks.push(new THREE.QuaternionKeyframeTrack(
              `${bone.name}.quaternion`,
              times,
              rotations
            ))
          }
        })

        console.log('Created tracks:', tracks)

        // 直接在这里创建和播放动画
        const mixer = new THREE.AnimationMixer(skinnedMesh as THREE.Object3D)
        setAnimationMixer(mixer)

        const clip = new THREE.AnimationClip('smd-animation', -1, tracks)
        setAnimationClip(clip)

        const action = mixer.clipAction(clip)
        action.setEffectiveTimeScale(1)
        action.setEffectiveWeight(1)
        action.blendMode = THREE.AdditiveAnimationBlendMode
        
        // 保存初始姿态
        skinnedMesh.skeleton.bones.forEach(bone => {
          smdParser.saveInitialPose(bone)
        })

        action.reset = function(this: THREE.AnimationAction): THREE.AnimationAction {
          skinnedMesh?.skeleton.bones.forEach(bone => {
            smdParser.resetBone(bone)
          })
          skinnedMesh?.skeleton.pose()
          return this
        }

        action.play()
        setCurrentAction(action)
      })
      .catch(error => {
        console.error('Error loading SMD:', error)
        setAnimationError(error.message)
      })
      .finally(() => {
        setIsLoadingAnimation(false)
      })

    return () => {
      if (animationMixer) {
        animationMixer.stopAllAction()
      }
    }
  }, [selectedAnimation, skinnedMesh, animations])

  // 修改动画更新部分
  useEffect(() => {
    if (!animationMixer || !currentAction) return

    const clock = new THREE.Clock()
    let frameId: number

    const updateAnimation = () => {
      const delta = clock.getDelta()
      animationMixer.update(delta)
      frameId = requestAnimationFrame(updateAnimation)
    }

    const updateProgress = () => {
      const duration = currentAction.getClip().duration
      const currentTime = currentAction.time % duration
      
      setAnimationControl({
        isPlaying: currentAction.isRunning(),
        speed: currentAction.getEffectiveTimeScale(),
        currentTime: currentTime,
        duration: duration,
        play: () => {
          currentAction.paused = false
          currentAction.play()
        },
        pause: () => {
          currentAction.paused = true
        },
        stop: () => {
          currentAction.stop()
          currentAction.reset()
          currentAction.time = 0
        },
        setSpeed: (speed) => {
          currentAction.timeScale = speed
        },
        setTime: (time) => {
          currentAction.time = time % duration
        }
      })
    }

    // 添加事件监听
    animationMixer.addEventListener('loop', updateProgress)
    animationMixer.addEventListener('finished', updateProgress)

    // 定期更新进度
    const interval = setInterval(updateProgress, 100)

    frameId = requestAnimationFrame(updateAnimation)
    
    return () => {
      if (frameId) cancelAnimationFrame(frameId)
      animationMixer.removeEventListener('loop', updateProgress)
      animationMixer.removeEventListener('finished', updateProgress)
      clearInterval(interval)
    }
  }, [animationMixer, currentAction])

  // 修改内置动画理
  useEffect(() => {
    if (!model || selectedAnimation) return // 如果选择了 SMD 动画，不处理内置动画

    // 如果有内置动画
    if (builtInAnimations.length > 0) {
      // 创建动画混合器
      const mixer = new THREE.AnimationMixer(model)
      setAnimationMixer(mixer)

      // 使用第一个内置动画
      const clip = builtInAnimations[0]
      setAnimationClip(clip)
      
      // 创建动作并播放
      const action = mixer.clipAction(clip)
      action.play()
      setCurrentAction(action)
      
      // 设置动画信息
      setAnimationInfo({
        name: clip.name || '默认动画',
        duration: clip.duration,
        frameCount: Math.floor(clip.duration * 30),
        boneCount: 0
      })
    }

    return () => {
      if (animationMixer) {
        animationMixer.stopAllAction()
      }
    }
  }, [model, selectedAnimation, builtInAnimations])

  // 重置姿势
  const resetPose = useCallback(() => {
    if (!model) return

    model.traverse((child) => {
      if (child instanceof THREE.SkinnedMesh) {
        child.skeleton.bones.forEach(bone => {
          smdParser.resetBone(bone)
        })
        child.skeleton.pose()
      }
    })
  }, [model])

  // 处理高亮效果
  useEffect(() => {
    if (!model) return

    model.traverse((child: THREE.Object3D) => {
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
  }, [model, highlightedPart])

  // 加相机初始化和模型位置调整的 useLayoutEffect
  useLayoutEffect(() => {
    if (!model) return

    // 计算包围盒
    const box = new THREE.Box3().setFromObject(model)
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    box.getSize(size)
    box.getCenter(center)

    // 计算合适的缩放
    const maxDim = Math.max(size.x, size.y, size.z)
    const targetSize = 4
    const scale = targetSize / maxDim
    
    // 应用缩放
    model.scale.setScalar(scale)

    // 重新计算缩放后的包围盒
    const scaledBox = new THREE.Box3().setFromObject(model)
    const modelHeight = (scaledBox.max.y - scaledBox.min.y)
    
    // 调整位，使模型位中心
    model.position.set(
      -center.x * scale,
      0,  // 保持y轴不变
      -center.z * scale
    )

    // 计算相机位置
    const cameraDistance = 8
    const cameraPosition = new THREE.Vector3(
      cameraDistance * Math.cos(Math.PI / 4),
      cameraDistance * 0.8,
      cameraDistance * Math.sin(Math.PI / 4)
    )
    const targetPosition = new THREE.Vector3(0, modelHeight * 0.3, 0)

    // 调相机和控制器
    if (controlsRef.current) {
      controlsRef.current.object.position.copy(cameraPosition)
      controlsRef.current.target.copy(targetPosition)
      
      // 设置控制
      controlsRef.current.minDistance = 0.1
      controlsRef.current.maxDistance = 100
      controlsRef.current.minPolarAngle = Math.PI * 0.1
      controlsRef.current.maxPolarAngle = Math.PI * 0.8
      
      controlsRef.current.update()
    }

    // 保存初始相机状态
    initialCameraRef.current = {
      position: cameraPosition.clone(),
      target: targetPosition.clone()
    }
  }, [model])

  // 添加重置视角的函数
  const resetCamera = () => {
    if (!controlsRef.current || !initialCameraRef.current) return

    controlsRef.current.object.position.copy(initialCameraRef.current.position)
    controlsRef.current.target.copy(initialCameraRef.current.target)
    controlsRef.current.update()
  }

  // 添加一个函数来判断是否需要显示右侧面板
  const shouldShowRightPanel = useCallback(() => {
    return showParts && parts.length > 0
  }, [parts.length, showParts])

  // 计算所有部件的选中状态
  const allPartsState = useMemo(() => {
    if (parts.length === 0) return { allSelected: false, allUnselected: false }
    const selectedCount = parts.filter(part => part.visible).length
    return {
      allSelected: selectedCount === parts.length,
      allUnselected: selectedCount === 0
    }
  }, [parts])

  const handleDeleteAnimation = async () => {
    if (!animationToDelete) return
    
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/animations/${animationToDelete.id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '删除失败')
      }

      // 更新动画列表
      setAnimations(prev => prev.filter(anim => anim.id !== animationToDelete.id))
      
      // 如果删除的是当前选中的动画，停止播放
      if (selectedAnimation === animationToDelete.id) {
        if (currentAction) {
          currentAction.stop()
          setCurrentAction(null)
        }
        if (animationMixer) {
          animationMixer.stopAllAction()
        }
        setSelectedAnimation(undefined)
      }

      toast.success('删除成功')
    } catch (error) {
      console.error('删除失败:', error)
      toast.error(error instanceof Error ? error.message : '删除失败，请稍后重试')
    } finally {
      setIsDeleting(false)
      setAnimationToDelete(null)
      setShowDeleteDialog(false)
    }
  }

  if (!model) return null

  return (
    <div className="h-screen flex">
      {/* 左侧模型预览 */}
      <div className={`flex-1 relative ${!shouldShowRightPanel() ? 'pr-0' : ''}`}>
        {/* 顶部工具栏 */}
        <div className="absolute top-4 left-4 z-10 space-y-3">
          {/* 模型名称 - 自适应宽度 */}
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

          {/* SMD 动画控制区域 */}
          {animations.length > 0 ? (
            <div className="space-y-3">
              {/* SMD 动画选择器 */}
              <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 overflow-hidden">
                {showSMDList ? (
                  <>
                    {/* 开状态：显示标和列表 */}
                    <button
                      onClick={() => setShowSMDList(false)}
                      className="w-full px-6 py-3 flex items-center justify-between bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <svg 
                          className="w-5 h-5"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-medium">SMD 动画</span>
                      </div>
                      <svg 
                        className="w-5 h-5 rotate-180"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {/* 动画列表 */}
                    <div className="p-2 border-t border-gray-100 bg-white/95">
                      <div className="space-y-1 max-h-60 overflow-y-auto">
                        {animations.map(anim => (
                          <div
                            key={anim.id}
                            className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                              selectedAnimation === anim.id
                                ? 'bg-blue-50'
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            <button
                              onClick={() => {
                                if (selectedAnimation !== anim.id) {
                                  if (currentAction) {
                                    currentAction.stop()
                                    setCurrentAction(null)
                                  }
                                  if (animationMixer) {
                                    animationMixer.stopAllAction()
                                  }
                                  setSelectedAnimation(anim.id)
                                }
                                setShowSMDList(false)
                              }}
                              className={`flex items-center space-x-2 flex-1 text-left ${
                                selectedAnimation === anim.id
                                  ? 'text-blue-700 font-medium'
                                  : 'text-gray-600'
                              }`}
                            >
                              <svg 
                                className={`w-4 h-4 ${
                                  selectedAnimation === anim.id ? 'text-blue-500' : 'text-gray-400'
                                }`}
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              </svg>
                              <span>{anim.name}</span>
                            </button>
                            <button
                              onClick={() => {
                                setAnimationToDelete(anim)
                                setShowDeleteDialog(true)
                              }}
                              className="p-1 text-gray-400 hover:text-red-500 transition-colors relative group"
                              title="删除动画"
                              disabled={isDeleting}
                            >
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              {isDeleting && animationToDelete?.id === anim.id && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="w-3 h-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* 收起状态：显示当前动画或选择按钮 */}
                    {selectedAnimation ? (
                      <div className="flex">
                        <button
                          onClick={() => setShowSMDList(true)}
                          className="flex-1 px-6 py-3 flex items-center space-x-3 text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <svg 
                            className="w-5 h-5 text-blue-500"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          </svg>
                          <span className="font-medium">
                            {animations.find(a => a.id === selectedAnimation)?.name || 'SMD 动画'}
                          </span>
                        </button>
                        <button
                          onClick={() => {
                            // 停止当前 SMD 动画
                            if (currentAction) {
                              currentAction.stop()
                              setCurrentAction(null)
                            }
                            if (animationMixer) {
                              animationMixer.stopAllAction()
                            }
                            setSelectedAnimation(undefined)
                            // 重新播放内置动画
                            if (builtInAnimations.length > 0) {
                              const mixer = new THREE.AnimationMixer(model!)
                              setAnimationMixer(mixer)
                              const action = mixer.clipAction(builtInAnimations[0])
                              action.play()
                              setCurrentAction(action)
                              setAnimationInfo({
                                name: builtInAnimations[0].name || '默认动画',
                                duration: builtInAnimations[0].duration,
                                frameCount: Math.floor(builtInAnimations[0].duration * 30),
                                boneCount: 0
                              })
                            }
                          }}
                          className="px-4 py-3 text-red-500 hover:bg-red-50 transition-colors border-l border-gray-100"
                          title="退出 SMD 动画"
                        >
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setShowSMDList(true)
                          if (!selectedAnimation && animations.length > 0) {
                            setSelectedAnimation(animations[0].id)
                          }
                        }}
                        className="w-full px-6 py-3 flex items-center justify-between text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <svg 
                            className="w-5 h-5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="font-medium">SMD 动画</span>
                        </div>
                        <svg 
                          className="w-5 h-5"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-500 px-4 py-2.5">
              <div className="relative inline-flex items-center group">
                <svg 
                  className="w-4 h-4 cursor-help"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="absolute left-0 bottom-full mb-2 w-72 p-2 bg-gray-800/95 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div>
                    在<Link href="/upload" className="text-blue-400 hover:text-blue-300">上传模型页面</Link>点击"上传动画"按钮以添加SMD动画
                  </div>
                  <div className="mt-1.5 pt-1.5 border-t border-gray-700">
                    <Link href="/help?category=animation&question=animation-1" className="text-blue-400 hover:text-blue-300">需要帮助？</Link>
                  </div>
                  <div className="absolute -bottom-1.5 left-4 w-3 h-3 bg-gray-800/95 rotate-45"></div>
                </div>
              </div>
              <span className="text-sm">SMD 动画</span>
              <svg 
                className="w-3.5 h-3.5 text-red-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}

          {/* 加载状态或错误提示 */}
          {(isLoadingAnimation || animationError) && (
            <div className="transition-all duration-200">
              {isLoadingAnimation && (
                <div className="bg-blue-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center space-x-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>正在加载动画...</span>
                </div>
              )}
              {animationError && (
                <div className="bg-red-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center space-x-2">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{animationError}</span>
                </div>
              )}
            </div>
          )}

          {/* 贴图错误提示 */}
          {textureErrors.length > 0 && (
            <div className="bg-yellow-500/90 backdrop-blur-sm text-white px-6 py-3 rounded-xl shadow-lg">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="space-y-1">
                  <div className="font-medium">以下贴图加载失败：</div>
                  <ul className="text-sm space-y-1">
                    {textureErrors.map((error, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <span>• {error}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="text-sm mt-2">
                    请确保已上传所有必需的贴图文件。
                    <Link href="/help?category=model&question=model-2" className="underline ml-1">
                      了解更多
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 添加控制按钮组 - 修改定位逻辑 */}
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
              {/* 坐标轴图标 - 使用不同颜色区分 XYZ 轴 */}
              <g transform="translate(12, 12)">
                {/* X轴 - 红色 */}
                <line x1="0" y1="0" x2="8" y2="0" stroke="#E74C3C" strokeWidth="1.5" />
                <polygon 
                  points="7,-2 11,0 7,2" 
                  fill="#E74C3C" 
                  stroke="none"
                  transform="translate(-1, 0)"
                />
                
                {/* Y轴 - 绿色 */}
                <line x1="0" y1="0" x2="0" y2="-8" stroke="#2ECC71" strokeWidth="1.5" />
                <polygon 
                  points="-2,-7 0,-11 2,-7" 
                  fill="#2ECC71" 
                  stroke="none"
                  transform="translate(0, 1)"
                />
                
                {/* Z轴 - 蓝色 */}
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
              {/* 简化的网格地面图标 */}
              <path d="M4 4v16h16" />  {/* 边框 */}
              <path d="M4 8h16" strokeWidth="1" />  {/* 水平网格线 */}
              <path d="M4 12h16" strokeWidth="1" />
              <path d="M4 16h16" strokeWidth="1" />
              <path d="M8 4v16" strokeWidth="1" />  {/* 垂直网格线 */}
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
              {/* 更形象的模型部件控制图标 */}
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 5h16" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 19h16" />
              <circle cx="7" cy="5" r="1" fill="currentColor" />
              <circle cx="15" cy="12" r="1" fill="currentColor" />
              <circle cx="10" cy="19" r="1" fill="currentColor" />
            </svg>
          </button>
        </div>

        <Canvas
          camera={{ 
            position: [8, 10, 8],
            fov: 45,
            near: 0.1,
            far: 2000
          }}
        >
          <color attach="background" args={['#f0f0f0']} />
          <ambientLight intensity={1} />
          <directionalLight 
            position={[5, 5, 5]} 
            intensity={1.5}
            castShadow
          />
          {model && (
            <>
              <primitive 
                object={model} 
                ref={sceneRef}
                castShadow 
                receiveShadow
              />
              
              {/* 有条件渲染坐标轴 */}
              {showAxes && <axesHelper args={[5]} />}
              
              {/* 有条件渲染地面 */}
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

              <OrbitControls 
                ref={controlsRef}
                enableZoom={true}
                enablePan={true}
                minDistance={0.1}
                maxDistance={100}
                target={[0, 0, 0]}
              />
              <Environment files="/hdr/buikslotermeerplein_1k.hdr" />
            </>
          )}
        </Canvas>
      </div>

      {/* 右侧控制面板 - 固定在视窗右侧 */}
      {shouldShowRightPanel() && (
        <div className="w-72 bg-white/80 backdrop-blur-sm flex flex-col fixed top-0 bottom-0 right-0 z-10 overflow-hidden">
          {/* 内容容器 */}
          <div className="absolute inset-0 flex flex-col">
            {/* 顶部留白，避免被页头遮挡 */}
            <div className="h-16 flex-shrink-0" />

            {/* 内容区域 - 可滚动区域 */}
            <div className="flex-1 overflow-y-auto min-h-0 pb-16"> {/* 添加 pb-16 确保底部内容不被遮挡 */}
              <div className="p-4 space-y-4">
                {/* 动画控制区域 */}
                <div className="space-y-4">
                  {/* 内置动画信息 */}
                  {builtInAnimations.length > 0 && !selectedAnimation && currentAction && (
                    <div className="space-y-2">
                      <h3 className="font-bold">内置动画</h3>
                      <div className="text-sm text-gray-600">
                        正在播放: {animationClip?.name || '默认动画'}
                      </div>
                    </div>
                  )}

                  {/* 动画信息和控制器 */}
                  {((builtInAnimations.length > 0 && !selectedAnimation) || selectedAnimation) && (
                    <>
                      {/* 动画信息 */}
                      {animationInfo && !isLoadingAnimation && !animationError && (
                        <div className="space-y-2">
                          <h3 className="font-bold">动画信息</h3>
                          <div className="text-sm space-y-1">
                            <p>名称: {animationInfo.name}</p>
                            <p>时长: {animationInfo.duration.toFixed(2)}</p>
                            <p>帧数: {animationInfo.frameCount}</p>
                            <p>骨骼数: {animationInfo.boneCount}</p>
                          </div>
                        </div>
                      )}

                      {/* 动画控制器 */}
                      {animationMixer && animationClip && !isLoadingAnimation && !animationError && (
                        <div className="space-y-4">
                          {/* 播放速度控制 */}
                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-gray-500">播放速度</span>
                              <span className="text-gray-700">{animationControl?.speed || 1}x</span>
                            </div>
                            <input
                              type="range"
                              min="0.1"
                              max="2"
                              step="0.1"
                              value={animationControl?.speed || 1}
                              onChange={(e) => {
                                const newSpeed = parseFloat(e.target.value)
                                animationControl?.setSpeed(newSpeed)
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
                              onClick={() => {
                                if (animationControl) {
                                  animationControl.isPlaying ? animationControl.pause() : animationControl.play()
                                }
                              }}
                              className="flex-1 px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                              disabled={!animationControl}
                            >
                              <svg 
                                className="w-4 h-4" 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="2"
                              >
                                {animationControl?.isPlaying ? (
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 4h4v16H6zM14 4h4v16h-4z" />
                                ) : (
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 9-14 9V3z" />
                                )}
                              </svg>
                              {animationControl?.isPlaying ? '暂停' : '播放'}
                            </button>
                            <button
                              onClick={() => animationControl?.stop()}
                              className="flex-1 px-3 py-1.5 bg-red-500 text-white rounded hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                              disabled={!animationControl}
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
                                style={{ width: `${((animationControl?.currentTime || 0) / (animationControl?.duration || 1)) * 100}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>{formatTime(animationControl?.currentTime || 0)}</span>
                              <span>{formatTime(animationControl?.duration || 0)}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* 分隔线 */}
                {((builtInAnimations.length > 0 && !selectedAnimation) || selectedAnimation) && showParts && parts.length > 0 && (
                  <div className="border-t border-gray-200"></div>
                )}

                {/* 模型部件控制区域 */}
                {showParts && parts.length > 0 && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
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
                            
                            {/* 部件名称 */}
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

      {/* 删除确认对话框 */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          if (!isDeleting) {
            setShowDeleteDialog(false)
            setAnimationToDelete(null)
          }
        }}
        onConfirm={handleDeleteAnimation}
        title="删除动画"
        message={`确定要删除动画 "${animationToDelete?.name}" 吗？此操作无法撤销。`}
        confirmText={isDeleting ? "删除中..." : "删除"}
        type="danger"
        disabled={isDeleting}
      />
    </div>
  )
}

export default function PreviewDaeScene({ initialModel }: PreviewDaeSceneProps) {
  return <ModelScene initialModel={initialModel} />
} 