/**
 * 格式化文件大小
 * @param bytes 文件大小（字节）
 * @returns 格式化后的文件大小字符串
 */
export const formatFileSize = (bytes: number) => {
  const mb = bytes / (1024 * 1024)
  if (mb >= 1) {
    return `${mb.toFixed(2)} MB`
  }
  return `${(bytes / 1024).toFixed(1)} KB`
} 