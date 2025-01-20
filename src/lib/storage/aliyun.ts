import OSS from 'ali-oss';
import { StorageProvider, PutResult, ListOptions, ListResult } from './types';

interface AliyunConfig {
  region: string;
  accessKeyId: string;
  accessKeySecret: string;
  bucket: string;
  secure: boolean;
}

export class AliyunStorage implements StorageProvider {
  private client: OSS;
  private bucket: string;

  constructor(config: AliyunConfig) {
    this.bucket = config.bucket;
    this.client = new OSS({
      region: config.region,
      accessKeyId: config.accessKeyId,
      accessKeySecret: config.accessKeySecret,
      bucket: config.bucket,
      secure: config.secure,
    });
  }

  async put(path: string, content: Buffer): Promise<PutResult> {
    const result = await this.client.put(path, content);
    const url = this.client.generateObjectUrl(path);
    return {
      url,
      etag: result.name
    };
  }

  async get(path: string): Promise<{ content: Buffer }> {
    const result = await this.client.get(path);
    return {
      content: result.content as Buffer
    };
  }

  async delete(path: string): Promise<void> {
    try {
      console.log(`Deleting from OSS: ${this.bucket}/${path}`);
      // 检查路径是否以斜杠结尾（表示文件夹）
      if (path.endsWith('/')) {
        await this.deleteFolder(path);
      } else {
        await this.client.delete(path);
      }
    } catch (error) {
      console.error('OSS delete error:', error);
      throw error;
    }
  }

  private async deleteFolder(prefix: string): Promise<void> {
    try {
      console.log(`Deleting folder from OSS: ${this.bucket}/${prefix}`);
      let continuationToken: string | undefined;
      
      do {
        // 列出文件夹下的所有对象
        const result = await this.client.list({
          prefix,
          'max-keys': 1000,
          marker: continuationToken
        }, {});

        if (!result.objects || result.objects.length === 0) {
          console.log(`No objects found in folder: ${prefix}`);
          break;
        }

        // 批量删除对象
        console.log(`Deleting ${result.objects.length} objects from folder ${prefix}`);
        await this.client.deleteMulti(result.objects.map(obj => obj.name));
        
        continuationToken = result.nextMarker;
      } while (continuationToken);
      
    } catch (error) {
      console.error('OSS delete folder error:', error);
      throw error;
    }
  }

  async getSignedUrl(path: string, expiresIn: number = 3600): Promise<string> {
    return this.client.signatureUrl(path, {
      expires: expiresIn
    });
  }

  async list(options?: ListOptions): Promise<ListResult> {
    const result = await this.client.list({
      ...options,
      'max-keys': options?.['max-keys'] || 100
    }, {});
    return {
      objects: result.objects?.map(obj => ({
        name: obj.name,
        size: obj.size,
        lastModified: obj.lastModified ? new Date(obj.lastModified) : undefined
      })),
      prefixes: result.prefixes,
      nextContinuationToken: result.nextMarker,
      isTruncated: result.isTruncated
    };
  }
} 