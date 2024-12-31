import { StorageProvider } from './storage/types';
import { AliyunStorage } from './storage/aliyun';
import { MinioStorage } from './storage/minio';

let storageProvider: StorageProvider;

if (process.env.STORAGE_TYPE === 'aliyun') {
  storageProvider = new AliyunStorage({
    region: process.env.OSS_REGION!,
    accessKeyId: process.env.OSS_ACCESS_KEY_ID!,
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET!,
    bucket: process.env.OSS_BUCKET!,
    secure: process.env.STORAGE_SECURE === 'true',
  });
} else if (process.env.STORAGE_TYPE === 'minio') {
  if (!process.env.MINIO_ENDPOINT) {
    throw new Error('MinIO endpoint is required');
  }
  storageProvider = new MinioStorage({
    endPoint: process.env.MINIO_ENDPOINT,
    port: process.env.MINIO_PORT ? parseInt(process.env.MINIO_PORT) : undefined,
    accessKeyId: process.env.MINIO_ACCESS_KEY!,
    accessKeySecret: process.env.MINIO_SECRET_KEY!,
    bucket: process.env.MINIO_BUCKET!,
    secure: process.env.STORAGE_SECURE === 'true',
  });
} else {
  throw new Error(`Unsupported storage type: ${process.env.STORAGE_TYPE}`);
}

export const storageClient = storageProvider; 