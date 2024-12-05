'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export default function DaePreviewTest() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const loadingRef = useRef<HTMLDivElement>(null)
  const errorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf3f4f6)

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 2000)
    const renderer = new THREE.WebGLRenderer({ 
      canvas, 
      antialias: true,
      alpha: true 
    })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.shadowMap.enabled = true

    const controls = new OrbitControls(camera, canvas)
    controls.enableDamping = true
    controls.autoRotate = true
    controls.autoRotateSpeed = 2

    // 添加灯光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(5, 5, 5)
    directionalLight.castShadow = true
    scene.add(directionalLight)

    const loader = new ColladaLoader()
    loader.load(
      '/example/models/dae/Wolf_One_dae.dae',
      (collada) => {
        if (loadingRef.current) {
          loadingRef.current.style.display = 'none'
        }
        const model = collada.scene
        scene.add(model)

        // 计算包围盒
        const box = new THREE.Box3().setFromObject(model)
        const center = box.getCenter(new THREE.Vector3())
        const size = box.getSize(new THREE.Vector3())

        // 调整模型位置到中心
        model.position.sub(center)

        // 计算合适的相机距离
        const maxDim = Math.max(size.x, size.y, size.z)
        const fov = camera.fov * (Math.PI / 180)
        const cameraDistance = maxDim / (2 * Math.tan(fov / 2))

        // 设置相机位置
        camera.position.set(cameraDistance, cameraDistance * 0.5, cameraDistance)
        camera.lookAt(0, 0, 0)
        controls.target.set(0, 0, 0)

        // 设置控制器限制
        controls.minDistance = cameraDistance * 0.5
        controls.maxDistance = cameraDistance * 2
      },
      null,
      (error) => {
        console.error('Error loading DAE:', error)
        if (loadingRef.current) {
          loadingRef.current.style.display = 'none'
        }
        if (errorRef.current) {
          errorRef.current.style.display = 'flex'
        }
      }
    )

    function animate() {
      requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <div className="w-full h-screen relative">
      <div ref={loadingRef} className="loading absolute inset-0 flex items-center justify-center flex-col bg-gray-100 z-20">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mb-2" />
        <div className="text-gray-600 font-system">加载中...</div>
      </div>
      
      <div ref={errorRef} className="error absolute inset-0 hidden items-center justify-center flex-col bg-gray-100 z-20 text-gray-500">
        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div className="mt-2">加载失败</div>
      </div>

      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  )
} 