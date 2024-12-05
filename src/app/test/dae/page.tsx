'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stage } from '@react-three/drei'
import { Suspense, useEffect, useState, useRef, useCallback } from 'react'
import { ColladaLoader } from 'three/addons/loaders/ColladaLoader.js'
import { useLoader } from '@react-three/fiber'
import * as THREE from 'three'

interface Part {
  name: string
  mesh: THREE.Mesh
  visible: boolean
}

// 添加新的接口
interface ModelFile {
  name: string
  path: string
}

function ModelScene({ 
  onPartsFound,
  highlightedPart,
  modelPath
}: { 
  onPartsFound: (parts: Part[]) => void
  highlightedPart?: string
  modelPath: string
}) {
  const result = useLoader(ColladaLoader, modelPath)
  const sceneRef = useRef<THREE.Group>(null)
  const originalMaterials = useRef<Map<string, THREE.Material | THREE.Material[]>>(new Map())
  const controlsRef = useRef<any>(null)
  
  // 添加自适应函数
  const fitCameraToModel = useCallback(() => {
    if (!result || !controlsRef.current) return

    // 计算模型包围盒
    const box = new THREE.Box3().setFromObject(result.scene)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())

    // 计算合适的相机距离
    const maxDim = Math.max(size.x, size.y, size.z)
    const fov = 50 // 相机视场角
    const cameraZ = maxDim / (2 * Math.tan((fov * Math.PI) / 360))
    
    // 重置模型位置到原点
    result.scene.position.set(0, 0, 0)
    
    // 调整模型位置，使其居中
    result.scene.position.sub(center)

    // 重置相机和控制器
    const cameraPosition = new THREE.Vector3(cameraZ, cameraZ * 0.5, cameraZ)
    controlsRef.current.object.position.copy(cameraPosition)
    controlsRef.current.target.set(0, 0, 0)
    
    // 设置合适的缩放范围
    controlsRef.current.minDistance = maxDim * 0.5
    controlsRef.current.maxDistance = maxDim * 2
    
    // 更新控制器
    controlsRef.current.update()
  }, [result])

  // 在模型加载和切换时自适应
  useEffect(() => {
    if (!result) return

    // 收集部件数组声明移到循环外部
    const newParts: Part[] = []

    // 处理材质和贴图
    result.scene.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh) {
        // 保存并应用原始材质
        if (Array.isArray(child.material)) {
          const materials = child.material.map(mat => {
            // 克隆材质
            const newMat = mat.clone()
            // 保持原始贴图
            if (mat.map) newMat.map = mat.map
            if (mat.normalMap) newMat.normalMap = mat.normalMap
            if (mat.specularMap) newMat.specularMap = mat.specularMap
            if (mat.alphaMap) newMat.alphaMap = mat.alphaMap
            return newMat
          })
          originalMaterials.current.set(child.name, materials)
          child.material = materials
        } else if (child.material) {
          // 克隆材质
          const newMat = child.material.clone()
          // 保持原始贴图
          if (child.material.map) newMat.map = child.material.map
          if (child.material.normalMap) newMat.normalMap = child.material.normalMap
          if (child.material.specularMap) newMat.specularMap = child.material.specularMap
          if (child.material.alphaMap) newMat.alphaMap = child.material.alphaMap
          
          // 如果材质有透明度设置
          if (child.material.transparent) {
            newMat.transparent = true
            newMat.opacity = child.material.opacity
          }
          
          // 如果是毛发材质（通常会有特殊的命名）
          if (child.name.toLowerCase().includes('fur')) {
            newMat.transparent = true
            newMat.side = THREE.DoubleSide
            newMat.alphaTest = 0.5
          }
          
          originalMaterials.current.set(child.name, newMat)
          child.material = newMat
        }

        // 添加到部件列表
        newParts.push({
          name: child.name,
          mesh: child,
          visible: true
        })
      }
    })

    // 更新部件列表
    if (newParts.length > 0) {
      onPartsFound(newParts)
    }

    // 自适应到屏幕中心
    fitCameraToModel()
  }, [result, modelPath, fitCameraToModel])

  // 处理高亮效果
  useEffect(() => {
    result.scene.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh) {
        const originalMaterial = originalMaterials.current.get(child.name)
        if (originalMaterial) {
          if (child.name === highlightedPart) {
            // 创建发光材质
            const highlightMaterial = new THREE.MeshPhongMaterial({
              color: new THREE.Color(0x00ff00),
              emissive: new THREE.Color(0x00ff00),
              emissiveIntensity: 0.5,
              transparent: true,
              opacity: 0.8
            })

            // 应用高亮材质
            if (Array.isArray(child.material)) {
              child.material = child.material.map(() => highlightMaterial)
            } else {
              child.material = highlightMaterial
            }
          } else {
            // 恢复原始材质
            if (Array.isArray(originalMaterial)) {
              child.material = originalMaterial.map(mat => mat.clone())
            } else {
              child.material = originalMaterial.clone()
            }
          }
        }
      }
    })
  }, [highlightedPart, result.scene])

  return (
    <>
      <primitive object={result.scene} ref={sceneRef} />
      <OrbitControls 
        ref={controlsRef}
        autoRotate
        autoRotateSpeed={0.5}
        enableZoom={true}
        enablePan={true}
        minDistance={1}
        maxDistance={20}
        target={[0, 0, 0]}
      />
    </>
  )
}

export default function DaeTest() {
  const [parts, setParts] = useState<Part[]>([])
  const [highlightedPart, setHighlightedPart] = useState<string>()
  const [models, setModels] = useState<ModelFile[]>([])
  const [selectedModel, setSelectedModel] = useState<string>('/example/models/dae/Wolf_One_dae.dae')

  // 加载模型列表
  useEffect(() => {
    async function loadModelList() {
      try {
        const response = await fetch('/api/dae-models')
        const data = await response.json()
        setModels(data)
      } catch (error) {
        console.error('Failed to load model list:', error)
      }
    }
    loadModelList()
  }, [])

  const handlePartsFound = useCallback((newParts: Part[]) => {
    setParts(newParts)
  }, [])

  // 修改单个部件可见性
  const togglePartVisibility = useCallback((index: number) => {
    setParts(currentParts => {
      return currentParts.map((part, i) => {
        if (i === index) {
          const newPart = {
            ...part,
            visible: !part.visible
          }
          if (newPart.mesh) {
            newPart.mesh.visible = newPart.visible
          }
          return newPart
        }
        return part
      })
    })
  }, [])

  // 添加回全选/全不选功能
  const toggleAll = useCallback((visible: boolean) => {
    setParts(currentParts => {
      return currentParts.map(part => {
        if (part.mesh) {
          part.mesh.visible = visible
        }
        return { ...part, visible }
      })
    })
  }, [])

  return (
    <div className="h-screen w-full relative flex">
      {/* 左侧模型列表 */}
      <div className="w-64 bg-white/80 backdrop-blur-sm p-4 border-r border-gray-200">
        <h3 className="font-bold mb-4">可用模型</h3>
        <div className="space-y-2">
          {models.map((model, index) => (
            <button
              key={index}
              onClick={() => setSelectedModel(model.path)}
              className={`w-full text-left px-3 py-2 rounded text-sm ${
                selectedModel === model.path
                  ? 'bg-blue-500 text-white'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              {model.name}
            </button>
          ))}
        </div>
      </div>

      {/* 中间 3D 视图 */}
      <div className="flex-1 relative">
        <Canvas
          camera={{ 
            position: [0, 0, 10], // 初始位置不那么重要，因为会被自适应函数覆盖
            fov: 50,
            near: 0.1,
            far: 2000 // 增加远平面距离
          }}
          shadows
        >
          <color attach="background" args={['#f0f0f0']} />
          <ambientLight intensity={0.5} />
          <directionalLight
            position={[10, 10, 5]}
            intensity={1}
            castShadow
          />
          <Suspense fallback={null}>
            <Stage
              environment="city"
              intensity={0.6}
              adjustCamera={false}
            >
              <ModelScene 
                onPartsFound={handlePartsFound}
                highlightedPart={highlightedPart}
                modelPath={selectedModel}
              />
            </Stage>
          </Suspense>
        </Canvas>
      </div>

      {/* 右侧部件控制面板 */}
      <div className="w-72 bg-white/80 backdrop-blur-sm p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold">模型部件: ({parts.length})</h3>
          <div className="space-x-2">
            <button
              onClick={() => toggleAll(true)}
              className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              全选
            </button>
            <button
              onClick={() => toggleAll(false)}
              className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              全不选
            </button>
          </div>
        </div>
        <div className="max-h-[calc(100vh-8rem)] overflow-y-auto">
          <ul className="space-y-1">
            {parts.map((part, index) => (
              <li 
                key={index}
                className="flex items-center space-x-2 text-sm"
                onMouseEnter={() => setHighlightedPart(part.name)}
                onMouseLeave={() => setHighlightedPart(undefined)}
              >
                <input
                  type="checkbox"
                  checked={part.visible}
                  onChange={() => togglePartVisibility(index)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className={`${part.visible ? 'text-gray-700' : 'text-gray-400'}`}>
                  {part.name}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
} 