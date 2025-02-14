import { NextResponse } from 'next/server';
import { mergeChunks } from '@/lib/upload-handler';

export async function POST(request: Request) {
  try {
    const { fileName, totalChunks } = await request.json();
    
    if (!fileName || typeof totalChunks !== 'number') {
      return NextResponse.json(
        { error: '缺少必要的参数' },
        { status: 400 }
      );
    }

    await mergeChunks(fileName, totalChunks);
    
    return NextResponse.json({ message: '文件合并成功' });
  } catch (error) {
    console.error('文件合并失败:', error);
    return NextResponse.json({ error: '文件合并失败' }, { status: 500 });
  }
} 