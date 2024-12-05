import { formatDistanceToNow } from 'date-fns/formatDistanceToNow'
import { zhCN } from 'date-fns/locale'

// 安全的时间格式化函数
export function formatTimeDistance(date: Date | string) {
  if (!date) return ''
  
  try {
    const d = typeof date === 'string' ? new Date(date) : date
    
    return formatDistanceToNow(d, { 
      addSuffix: true,
      locale: zhCN,
      includeSeconds: false
    })
  } catch (error) {
    console.error('格式化时间失败:', error)
    return ''
  }
}

// 格式化文件格式显示
export function formatFileType(format: string | undefined | null) {
  if (!format) return '未知格式'
  return format.split('/')[1]?.toUpperCase() || format.toUpperCase()
}

// 获取文件扩展名
export function getFileExtension(format: string | undefined | null) {
  if (!format) return ''
  return format.split('/')[1] || format
} 