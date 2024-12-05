declare module 'react-3d-viewer' {
  import { Component } from 'react'

  interface ModelProps {
    src: string
    width?: number
    height?: number
    scale?: number
    enableRotate?: boolean
    onLoad?: () => void
    children?: React.ReactNode
  }

  export class DAEModel extends Component<ModelProps> {}
} 