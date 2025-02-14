import { NextResponse } from 'next/server';
import { saveChunk } from '@/lib/upload-handler';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const chunk = formData.get('chunk') as Blob;
    const hash = formData.get('hash') as string;
    const fileName = formData.get('fileName') as string;
    
    if (!chunk || !hash || !fileName) {
      return NextResponse.json(
        { error: '缺少必要的参数' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await chunk.arrayBuffer());
    await saveChunk(buffer, hash, fileName);
    
    return NextResponse.json({ message: '分片上传成功' });
  } catch (error) {
    console.error('分片上传失败:', error);
    return NextResponse.json({ error: '分片上传失败' }, { status: 500 });
  }
} 