import OSS from 'ali-oss'

// 创建全局 OSS 客户端实例
export const ossClient = new OSS({
  region: process.env.OSS_REGION!,
  accessKeyId: process.env.OSS_ACCESS_KEY_ID!,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET!,
  bucket: process.env.OSS_BUCKET!,
  secure: true, // 使用 HTTPS
}) 