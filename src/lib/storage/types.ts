export interface PutResult {
  url: string;
  etag?: string;
}

export interface StorageProvider {
  put(path: string, content: Buffer): Promise<PutResult>;
  get(path: string): Promise<{ content: Buffer }>;
  delete(path: string): Promise<void>;
  getSignedUrl(path: string, expiresIn?: number): Promise<string>;
} 