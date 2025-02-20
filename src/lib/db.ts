import { PrismaClient } from "@prisma/client";
import { withOptimize } from "@prisma/extension-optimize";
import os from 'os';

const shouldEnableAnalytics = () => {
  const interfaces = os.networkInterfaces();
  const localIp = Object.values(interfaces).flat().find(ip => ip?.family === 'IPv4' && !ip.internal)?.address;
  return process.env.NODE_ENV === 'development' && localIp === process.env.Server_IP;
};

const globalForPrisma = global as unknown as { prisma: PrismaClient };

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