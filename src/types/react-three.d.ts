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