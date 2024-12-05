import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

export async function GET() {
  try {
    const animationsDir = path.join(process.cwd(), 'public/uploads/models/dae/smd')
    const files = await fs.readdir(animationsDir)
    const smdFiles = files.filter(file => file.endsWith('.smd'))
    
    // 返回文件列表和每个文件的基本信息
    const animations = smdFiles.map(file => ({
      id: file,
      name: file.replace('.smd', ''),
      path: `/uploads/models/dae/smd/${file}`
    }))
    
    return NextResponse.json(animations)
  } catch (error) {
    console.error('Error reading animations directory:', error)
    return NextResponse.json({ error: 'Failed to load animations' }, { status: 500 })
  }
} 