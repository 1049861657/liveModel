import OSS from 'ali-oss';
import { StorageProvider, PutResult } from './types';

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
    await this.client.delete(path);
  }

  async getSignedUrl(path: string, expiresIn: number = 3600): Promise<string> {
    return this.client.signatureUrl(path, {
      expires: expiresIn
    });
  }
} 