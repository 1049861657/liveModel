import { prisma } from '@/lib/db'

// 导出基础模型组件
export { default as Shiba } from './Shiba'
export { default as ModelWithAnimations } from './Model-with-animations'

// 从 API 获取模型列表
export async function getModelList() {
  try {
    const response = await fetch('/api/demo-models')
    const data = await response.json()
    return data
  } catch (error) {
    console.error('Failed to load demo models:', error)
    // 返回默认模型列表作为后备
    return [
      { id: 'shiba', name: '柴犬' },
      { id: 'model-with-animations', name: '带动画模型' }
    ]
  }
}

// 导出模型组件映射
export const Models = {
  Shiba: require('./Shiba').default,
  ModelWithAnimations: require('./Model-with-animations').default
} 