/// <reference types="@react-three/fiber" />
/// <reference types="@react-three/drei" />

declare module '@react-three/fiber' {
  interface ThreeElements {
    primitive: any
  }
  export { Canvas } from '@react-three/fiber/dist/declarations/src/web/Canvas'
  export { useLoader } from '@react-three/fiber/dist/declarations/src/core/useLoader'
  export { useFrame } from '@react-three/fiber/dist/declarations/src/core/useFrame'
  export type { RootState } from '@react-three/fiber/dist/declarations/src/core/store'
  export { useGraph } from '@react-three/fiber/dist/declarations/src/core/useGraph'
}

// 添加 drei 的类型声明
declare module '@react-three/drei' {
  export function useAnimations<T = any>(
    clips: THREE.AnimationClip[],
    target?: React.RefObject<THREE.Object3D>
  ): {
    actions: { [key: string]: THREE.AnimationAction }
    names: string[]
    clips: THREE.AnimationClip[]
  }

  // 添加 useGLTF 的类型声明
  export function useGLTF<T = any>(
    path: string,
    useDraco?: boolean | string,
    useMeshOpt?: boolean,
    extendLoader?: (loader: any) => void
  ): T
}

// GLTFLoader 类型声明
declare module 'three/examples/jsm/loaders/GLTFLoader' {
  import { Object3D, AnimationClip } from 'three'
  
  export interface GLTF {
    animations: AnimationClip[]
    scene: Object3D
    scenes: Object3D[]
    cameras: Camera[]
    asset: {
      copyright?: string
      generator?: string
      version?: string
      minVersion?: string
      extensions?: any
      extras?: any
    }
    parser: any
    userData: any
  }

  export class GLTFLoader {
    load(
      url: string,
      onLoad?: (gltf: GLTF) => void,
      onProgress?: (event: ProgressEvent) => void,
      onError?: (event: ErrorEvent) => void
    ): void
    
    parse(
      data: ArrayBuffer | string,
      path: string,
      onLoad: (gltf: GLTF) => void,
      onError?: (event: ErrorEvent) => void
    ): void
  }
} 