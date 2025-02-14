import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const TEMP_DIR = path.join(process.cwd(), 'uploads', 'temp');
const BUFFER_SIZE = 64 * 1024; // 64KB buffer

// 确保上传目录存在
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

export async function saveChunk(chunk: Buffer, hash: string, fileName: string) {
  try {
    const fileDir = path.join(TEMP_DIR, path.basename(fileName, path.extname(fileName)));
    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir, { recursive: true });
    }

    const chunkPath = path.join(fileDir, hash);
    
    // 直接写入文件
    fs.writeFileSync(chunkPath, chunk);

    return true;
  } catch (error) {
    console.error('保存分片失败:', error);
    throw error;
  }
}

export async function mergeChunks(fileName: string, totalChunks: number) {
  try {
    const fileDir = path.join(TEMP_DIR, path.basename(fileName, path.extname(fileName)));
    const finalPath = path.join(UPLOAD_DIR, fileName);

    if (!fs.existsSync(fileDir)) {
      throw new Error('找不到文件分片信息');
    }

    const writeStream = fs.createWriteStream(finalPath);

    // 按顺序合并分片
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = path.join(fileDir, `${fileName}-${i}`);
      if (!fs.existsSync(chunkPath)) {
        throw new Error(`分片 ${i} 不存在: ${chunkPath}`);
      }

      const chunkBuffer = fs.readFileSync(chunkPath);
      writeStream.write(chunkBuffer);

      // 删除已处理的分片
      fs.unlinkSync(chunkPath);
    }

    writeStream.end();

    // 等待写入完成
    await new Promise<void>((resolve, reject) => {
      writeStream.on('finish', () => {
        try {
          // 清理临时目录
          if (fs.existsSync(fileDir)) {
            fs.rmSync(fileDir, { recursive: true, force: true });
          }
          resolve();
        } catch (err) {
          reject(err);
        }
      });
      writeStream.on('error', reject);
    });

    return true;
  } catch (error) {
    console.error('合并文件失败:', error);
    // 清理临时文件
    const fileDir = path.join(TEMP_DIR, path.basename(fileName, path.extname(fileName)));
    try {
      if (fs.existsSync(fileDir)) {
        fs.rmSync(fileDir, { recursive: true, force: true });
      }
    } catch (cleanupError) {
      console.error('清理临时文件失败:', cleanupError);
    }
    throw error;
  }
} 