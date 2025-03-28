import { Client as MinioClient } from 'minio';
import { type StorageProvider, type PutResult, type ListOptions, type ListResult } from './types';

interface MinioConfig {
  endPoint: string;
  port?: number;
  accessKeyId: string;
  accessKeySecret: string;
  bucket: string;
  secure: boolean;
}

export class MinioStorage implements StorageProvider {
  private client: MinioClient;
  private bucket: string;
  private endPoint: string;
  private secure: boolean;
  private port?: number;
  private isDomain: boolean;

  constructor(config: MinioConfig) {
    this.bucket = config.bucket;
    this.endPoint = config.endPoint;
    this.secure = config.secure;
    this.port = config.port;

    // 检查是否为域名（是否包含点号且不是IP地址）
    this.isDomain = this.endPoint.includes('.') && !/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(this.endPoint);
    
    this.client = new MinioClient({
      endPoint: config.endPoint,
      port: this.isDomain ? undefined : (config.port || 9000),
      useSSL: config.secure,
      accessKey: config.accessKeyId,
      secretKey: config.accessKeySecret
    });
  }

  private async ensureBucketPublicReadable() {
    try {
      // 设置 bucket policy 允许公共读取
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${this.bucket}/*`]
          }
        ]
      };

      await this.client.setBucketPolicy(this.bucket, JSON.stringify(policy));
      console.log(`Set public read policy for bucket: ${this.bucket}`);
    } catch (error) {
      console.error('Error setting bucket policy:', error);
      throw error;
    }
  }

  async put(path: string, content: Buffer): Promise<PutResult> {
    try {
      console.log('Checking bucket existence:', this.bucket);
      const exists = await this.client.bucketExists(this.bucket);
      
      if (!exists) {
        console.log(`Bucket ${this.bucket} does not exist, creating...`);
        await this.client.makeBucket(this.bucket, 'us-east-1');
        console.log(`Bucket ${this.bucket} created successfully`);
        // 新建 bucket 后设置公共读取权限
        await this.ensureBucketPublicReadable();
      }

      console.log(`Uploading file to path: ${path}`);
      await this.client.putObject(this.bucket, path, content);
      
      const url = this.getPublicUrl(path);
      console.log(`File uploaded successfully, generated URL: ${url}`);
      
      return { url };
    } catch (error) {
      console.error('MinIO operation failed:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
      }
      throw error;
    }
  }

  async get(path: string): Promise<{ content: Buffer }> {
    try {
      console.log(`Downloading from MinIO: ${this.bucket}/${path}`);
      const dataStream = await this.client.getObject(this.bucket, path);
      return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        dataStream.on('data', (chunk: Buffer) => chunks.push(chunk));
        dataStream.on('end', () => resolve({ content: Buffer.concat(chunks) }));
        dataStream.on('error', reject);
      });
    } catch (error) {
      console.error('MinIO download error:', error);
      throw error;
    }
  }

  async delete(path: string): Promise<void> {
    try {
      console.log(`Deleting from MinIO: ${this.bucket}/${path}`);
      // 检查路径是否以斜杠结尾（表示文件夹）
      if (path.endsWith('/')) {
        await this.deleteFolder(path);
      } else {
        await this.client.removeObject(this.bucket, path);
      }
    } catch (error) {
      console.error('MinIO delete error:', error);
      throw error;
    }
  }

  private async deleteFolder(prefix: string): Promise<void> {
    try {
      console.log(`Deleting folder from MinIO: ${this.bucket}/${prefix}`);
      const objectsList: string[] = [];
      
      // 列出文件夹下的所有对象
      const objectsStream = this.client.listObjects(this.bucket, prefix, true);
      
      for await (const obj of objectsStream) {
        if (obj.name) {
          objectsList.push(obj.name);
        }
      }

      if (objectsList.length === 0) {
        console.log(`No objects found in folder: ${prefix}`);
        return;
      }

      // 批量删除对象
      console.log(`Deleting ${objectsList.length} objects from folder ${prefix}`);
      await this.client.removeObjects(this.bucket, objectsList);
      
    } catch (error) {
      console.error('MinIO delete folder error:', error);
      throw error;
    }
  }

  async getSignedUrl(path: string, expiresIn: number = 3600): Promise<string> {
    try {
      console.log(`Generating signed URL for: ${this.bucket}/${path}`);
      return await this.client.presignedGetObject(this.bucket, path, expiresIn);
    } catch (error) {
      console.error('MinIO signed URL error:', error);
      throw error;
    }
  }

  private getPublicUrl(path: string): string {
    const protocol = this.secure ? 'https' : 'http';
    const portStr = this.isDomain ? '' : (this.port ? `:${this.port}` : '');
    return `${protocol}://${this.endPoint}${portStr}/${this.bucket}/${path}`;
  }

  async list(options?: ListOptions): Promise<ListResult> {
    try {
      console.log(`Listing objects from MinIO: ${this.bucket}/${options?.prefix || ''}`);
      const objects: Array<{
        name: string;
        size: number;
        lastModified?: Date;
      }> = [];

      const objectsStream = this.client.listObjects(
        this.bucket,
        options?.prefix || '',
        true,
        { MaxKeys: options?.['max-keys'] || 100 }
      );

      for await (const obj of objectsStream) {
        if (obj.name) {
          objects.push({
            name: obj.name,
            size: obj.size,
            lastModified: obj.lastModified
          });
        }
      }

      return {
        objects,
        prefixes: [],
        isTruncated: false
      };
    } catch (error) {
      console.error('MinIO list error:', error);
      throw error;
    }
  }
} 