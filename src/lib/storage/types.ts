export interface PutResult {
  url: string;
  etag?: string;
}

export interface ListOptions {
  prefix?: string;
  'max-keys'?: number;
}

export interface ListResult {
  objects?: Array<{
    name: string;
    size: number;
    lastModified?: Date;
  }>;
  prefixes?: string[];
  nextContinuationToken?: string;
  isTruncated?: boolean;
}

export interface StorageProvider {
  put(path: string, content: Buffer): Promise<PutResult>;
  get(path: string): Promise<{ content: Buffer }>;
  delete(path: string): Promise<void>;
  getSignedUrl(path: string, expiresIn?: number): Promise<string>;
  list(options?: ListOptions): Promise<ListResult>;
} 