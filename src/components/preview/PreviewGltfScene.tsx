'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import * as BABYLON from '@babylonjs/core'
import '@babylonjs/loaders'
import type { Model } from '@prisma/client'

// 内联Spinner组件
function Spinner() {
  return (
    <div className="flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-200 rounded-full animate-spin border-t-blue-500" />
    </div>
  )
}

interface PreviewGltfSceneProps {
  initialModel: Model & {
    user: {
      id: string
      name: string | null
      email: string
      avatar: { url: string } | null
    }
  }
}


export default function PreviewGltfScene({ initialModel }: PreviewGltfSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [showAxes, setShowAxes] = useState(false)
  const [showGround, setShowGround] = useState(true)
  const [showParts, setShowParts] = useState(true)
  const [parts, setParts] = useState<{ name: string; mesh: BABYLON.AbstractMesh; visible: boolean }[]>([])
  const [highlightedPart, setHighlightedPart] = useState<string>()
  const originalMaterials = useRef<Map<string, BABYLON.Material | null>>(new Map())
  const sceneRef = useRef<BABYLON.Scene | null>(null)
  const axesRef = useRef<BABYLON.AxesViewer | null>(null)
  const groundRef = useRef<BABYLON.Mesh | null>(null)
  
  // 更新坐标轴显示状态
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return

    if (showAxes) {
      if (!axesRef.current) {
        // 使用官方 AxesViewer，设置合适的缩放和线条粗细
        axesRef.current = new BABYLON.AxesViewer(
          scene,  // scene
          2,      // scaleLines - 坐标轴长度
          1,      // renderingGroupId - 使用较低的渲染组ID
          undefined, // xAxis
          undefined, // yAxis
          undefined, // zAxis
          0.5       // lineThickness - 较细的线条
        )
      }
    } else {
      if (axesRef.current) {
        axesRef.current.dispose()
        axesRef.current = null
      }
    }
  }, [showAxes])

  // 创建网格的函数
  const createGround = (scene: BABYLON.Scene) => {
    // 如果已存在网格，先清除
    if (groundRef.current) {
      groundRef.current.dispose()
      groundRef.current = null
    }

    // 创建地面网格
    const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 20, height: 20 }, scene)
    const groundMaterial = new BABYLON.StandardMaterial('groundMaterial', scene)
    groundMaterial.diffuseColor = new BABYLON.Color3(0.9, 0.9, 0.9)
    groundMaterial.alpha = 0.1
    ground.material = groundMaterial
    ground.position.y = 0
    groundRef.current = ground

    // 添加网格线
    const gridSize = 20
    const gridLines = 20
    const spacing = gridSize / gridLines
    const lineColor = new BABYLON.Color3(0.5, 0.5, 0.5)

    for (let i = 0; i <= gridLines; i++) {
      const xPos = (i * spacing) - (gridSize / 2)
      const zPos = (i * spacing) - (gridSize / 2)

      // 创建X方向的线
      const xLine = BABYLON.MeshBuilder.CreateLines('xLine' + i, {
        points: [
          new BABYLON.Vector3(xPos, 0, -gridSize/2),
          new BABYLON.Vector3(xPos, 0, gridSize/2)
        ]
      }, scene)
      xLine.color = lineColor
      xLine.parent = ground

      // 创建Z方向的线
      const zLine = BABYLON.MeshBuilder.CreateLines('zLine' + i, {
        points: [
          new BABYLON.Vector3(-gridSize/2, 0, zPos),
          new BABYLON.Vector3(gridSize/2, 0, zPos)
        ]
      }, scene)
      zLine.color = lineColor
      zLine.parent = ground
    }

    // 创建中心十字线
    const centerLineColor = new BABYLON.Color3(0.7, 0.7, 0.7)
    const centerXLine = BABYLON.MeshBuilder.CreateLines('centerXLine', {
      points: [
        new BABYLON.Vector3(-gridSize/2, 0, 0),
        new BABYLON.Vector3(gridSize/2, 0, 0)
      ]
    }, scene)
    centerXLine.color = centerLineColor
    centerXLine.parent = ground

    const centerZLine = BABYLON.MeshBuilder.CreateLines('centerZLine', {
      points: [
        new BABYLON.Vector3(0, 0, -gridSize/2),
        new BABYLON.Vector3(0, 0, gridSize/2)
      ]
    }, scene)
    centerZLine.color = centerLineColor
    centerZLine.parent = ground
  }

  // 更新地面网格显示状态
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return

    if (showGround) {
      createGround(scene)
    } else {
      if (groundRef.current) {
        groundRef.current.dispose()
        groundRef.current = null
      }
    }
  }, [showGround])

  useEffect(() => {
    if (!canvasRef.current) return

    let engine: BABYLON.Engine | null = null
    let scene: BABYLON.Scene | null = null

    async function initScene() {
      if (!canvasRef.current) return

      try {
        setLoading(true)
        setError(null)

        // 创建引擎和场景
        engine = new BABYLON.Engine(canvasRef.current, true)
        scene = new BABYLON.Scene(engine)
        sceneRef.current = scene

        // 设置场景背景和清除颜色
        scene.clearColor = new BABYLON.Color4(0.93, 0.93, 0.93, 1)

        // 创建相机
        const camera = new BABYLON.ArcRotateCamera(
          'camera',
          0,
          Math.PI / 3,
          10,
          BABYLON.Vector3.Zero(),
          scene
        )
        camera.attachControl(canvasRef.current, true, true)
        camera.wheelPrecision = 50
        camera.lowerRadiusLimit = 2
        camera.upperRadiusLimit = 50
        camera.useNaturalPinchZoom = true
        camera.panningSensibility = 50
        camera.wheelDeltaPercentage = 0.1
        camera.pinchDeltaPercentage = 0.1

        // 阻止默认的滚轮行为
        scene.onPrePointerObservable.add((pointerInfo) => {
          if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERWHEEL) {
            pointerInfo.event.preventDefault()
          }
        })

        // 添加光源
        const light1 = new BABYLON.DirectionalLight(
          'light1',
          new BABYLON.Vector3(1, -1, 1),
          scene
        )
        light1.intensity = 0.7

        const light2 = new BABYLON.HemisphericLight(
          'light2',
          new BABYLON.Vector3(0, 1, 0),
          scene
        )
        light2.intensity = 0.5

        // 设置纯色背景
        scene.clearColor = new BABYLON.Color4(0.93, 0.93, 0.93, 1)

        // 只使用HDR光照，不创建天空盒
        const envTexture = new BABYLON.HDRCubeTexture(
          '/hdr/meadow_2_4k.hdr',
          scene,
          512
        )
        scene.environmentTexture = envTexture

        // 如果showGround为true，创建初始网格
        if (showGround) {
          createGround(scene)
        }

        // 加载 GLTF 模型
        const result = await BABYLON.SceneLoader.LoadAssetContainerAsync(
          '',
          initialModel.filePath,
          scene
        )

        // 将模型添加到场景
        result.addAllToScene()

        // 收集模型部件
        const newParts: { name: string; mesh: BABYLON.AbstractMesh; visible: boolean }[] = []
        result.meshes.forEach((mesh) => {
          if (mesh.name !== '__root__') {
            originalMaterials.current.set(mesh.name, mesh.material)
            newParts.push({
              name: mesh.name,
              mesh: mesh,
              visible: true
            })
          }
        })
        setParts(newParts)

        // 自动调整相机视角以适应模型
        if (result.meshes.length > 0) {
          const boundingInfo = result.meshes[0].getHierarchyBoundingVectors()
          const center = boundingInfo.min.add(boundingInfo.max).scale(0.5)
          const radius = boundingInfo.max.subtract(boundingInfo.min).length() * 0.5

          // 调整模型位置到地面
          result.meshes.forEach(mesh => {
            if (mesh.parent === null) {  // 只移动根级别的网格
              mesh.position.y -= boundingInfo.min.y  // 将模型底部对齐到地面
            }
          })

          // 设置相机位置和目标
          camera.setTarget(center)
          camera.setPosition(new BABYLON.Vector3(
            center.x + radius * 2,
            center.y + radius,
            center.z + radius * 2
          ))
        }

        // 处理高亮效果
        const renderScene = scene as BABYLON.Scene
        renderScene.onBeforeRenderObservable.add(() => {
          parts.forEach(part => {
            if (part.name === highlightedPart) {
              if (part.mesh.material) {
                const highlightMaterial = new BABYLON.StandardMaterial('highlight', renderScene)
                highlightMaterial.diffuseColor = new BABYLON.Color3(0, 1, 0)
                highlightMaterial.emissiveColor = new BABYLON.Color3(0, 0.5, 0)
                highlightMaterial.alpha = 0.8
                part.mesh.material = highlightMaterial
              }
            } else {
              const originalMaterial = originalMaterials.current.get(part.name)
              if (originalMaterial) {
                part.mesh.material = originalMaterial
              }
            }
          })
        })

        setLoading(false)

        // 渲染循环
        engine.runRenderLoop(() => {
          if (scene) {
            scene.render()
          }
        })

        // 响应窗口大小变化
        const handleResize = () => {
          if (engine) {
            engine.resize()
          }
        }
        window.addEventListener('resize', handleResize)

        return () => {
          window.removeEventListener('resize', handleResize)
          scene?.dispose()
          engine?.dispose()
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to load model')
        setError(error)
        console.error('GLTF加载错误:', error)
        setLoading(false)
      }
    }

    initScene()
  }, [initialModel.filePath])

  // 判断是否显示右侧面板
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

  // 添加全选/全不选函数
  const setAllPartsVisibility = (visible: boolean) => {
    setParts(prevParts => 
      prevParts.map(part => {
        part.mesh.isVisible = visible
        return { ...part, visible }
      })
    )
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">加载失败</h3>
          <p className="mt-1 text-sm text-gray-500">{error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen relative">
      {/* 3D 场景 */}
      <div className="absolute inset-0">
        {/* 顶部工具栏 */}
        <div className="absolute top-4 left-4 z-10">
          {/* 模型名称 */}
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
        </div>

        {/* 控制按钮组 */}
        <div className={`absolute top-4 z-10 flex flex-col gap-2 ${
          parts.length > 0 
            ? 'right-[18.5rem]'
            : 'right-4'
        }`}>
          <button
            onClick={() => {
              const scene = sceneRef.current
              if (!scene) return
              
              const camera = scene.activeCamera as BABYLON.ArcRotateCamera
              if (!camera) return

              // 重置相机位置
              camera.alpha = 0
              camera.beta = Math.PI / 3
              camera.radius = 10
            }}
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
              <g transform="translate(12, 12)">
                <line x1="0" y1="0" x2="8" y2="0" stroke="#E74C3C" strokeWidth="1.5" />
                <polygon 
                  points="7,-2 11,0 7,2" 
                  fill="#E74C3C" 
                  stroke="none"
                  transform="translate(-1, 0)"
                />
                <line x1="0" y1="0" x2="0" y2="-8" stroke="#2ECC71" strokeWidth="1.5" />
                <polygon 
                  points="-2,-7 0,-11 2,-7" 
                  fill="#2ECC71" 
                  stroke="none"
                  transform="translate(0, 1)"
                />
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
              <path d="M4 4v16h16" />
              <path d="M4 8h16" strokeWidth="1" />
              <path d="M4 12h16" strokeWidth="1" />
              <path d="M4 16h16" strokeWidth="1" />
              <path d="M8 4v16" strokeWidth="1" />
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
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 5h16" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 19h16" />
              <circle cx="7" cy="5" r="1" fill="currentColor" />
              <circle cx="15" cy="12" r="1" fill="currentColor" />
              <circle cx="10" cy="19" r="1" fill="currentColor" />
            </svg>
          </button>
        </div>

        {/* 右侧信息面板 - 根据条件显示 */}
        {showParts && parts.length > 0 && (
          <div className="w-72 bg-white/80 backdrop-blur-sm flex flex-col fixed top-0 bottom-0 right-0 z-10 overflow-hidden">
            <div className="absolute inset-0 flex flex-col">
              {/* 顶部留白 */}
              <div className="h-16 flex-shrink-0" />

              {/* 内容区域 - 可滚动 */}
              <div className="flex-1 overflow-y-auto min-h-0 pb-16">
                <div className="p-4 space-y-4">
                  {/* 模型部件 */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
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
                                part.mesh.setEnabled(true)
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
                                part.mesh.setEnabled(false)
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
                                    p.mesh.setEnabled(!p.visible)
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
                            <span className={part.visible ? 'text-gray-700' : 'text-gray-400'}>
                              {part.name}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <Spinner />
          </div>
        )}
        <canvas
          ref={canvasRef}
          className={`w-full h-full ${loading ? 'opacity-0' : 'opacity-100'}`}
        />
      </div>
    </div>
  )
} 