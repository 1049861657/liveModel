export interface ModelInfo {
  id: string
  name: string
  url: string
  description: string
  thumbnail?: string
  component?: string
}

export const modelList: ModelInfo[] = [
  { 
    id: 'shiba', 
    name: '柴犬', 
    url: '/example/models/shiba.glb',
    description: '一个可爱的柴犬3D模型',
    thumbnail: '/example/thumbnails/shiba.jpg',
    component: 'Shiba'
  },
  { 
    id: 'model-with-animations', 
    name: '带动画人物', 
    url: '/example/models/model-with-animations.glb',
    description: '一个带有动画的人物模型',
    thumbnail: '/example/thumbnails/model-with-animations.jpg',
    component: 'ModelWithAnimations'
  }
]