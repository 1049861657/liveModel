import { PrismaClient } from "@prisma/client";
import { withOptimize } from "@prisma/extension-optimize";
import os from 'os';

// 获取本机IP地址
const getLocalIpAddress = () => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const interface_ of interfaces[name] ?? []) {
      if (interface_.family === 'IPv4' && !interface_.internal) {
        return interface_.address;
      }
    }
  }
  return null;
};

// 检查是否启用分析
const shouldEnableAnalytics = () => {
  const isTestEnv = process.env.NODE_ENV === 'development';
  const localIp = getLocalIpAddress();
  const isTargetIp = localIp === '142.171.245.167';
  
  return isTestEnv && isTargetIp;
};

const globalForPrisma = global as unknown as {
  prisma: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : []
  }).$extends(
    withOptimize({ 
      apiKey: process.env.OPTIMIZE_API_KEY!,
      enable: shouldEnableAnalytics()
    })
  );

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;