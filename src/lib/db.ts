// import { PrismaClient } from '@prisma/client'

// const globalForPrisma = global as unknown as { prisma: PrismaClient }

// export const prisma =
//   globalForPrisma.prisma ||
//   new PrismaClient({
//     log: ['query']
//   })

// import { PrismaClient } from "@prisma/client";
// import { withOptimize } from "@prisma/extension-optimize";

// const globalForPrisma = global as unknown as {
//   prisma: PrismaClient;
// };

// export const prisma =
//   globalForPrisma.prisma ||
//   new PrismaClient({
//     log: process.env.NODE_ENV === 'development' ? ['query'] : []
//   }).$extends(
//     withOptimize(
//       { apiKey: process.env.OPTIMIZE_API_KEY ?? "" ,
//         enable: process.env.ENVIRONMENT === 'development'
//       })
//   );

// if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;


import { PrismaClient } from "@prisma/client";
import { withOptimize } from "@prisma/extension-optimize";

export const prisma = new PrismaClient().$extends(
  withOptimize({ apiKey: process.env.OPTIMIZE_API_KEY!}),
);