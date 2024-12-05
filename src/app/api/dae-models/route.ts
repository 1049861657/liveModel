import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

export async function GET() {
  try {
    const modelsDir = path.join(process.cwd(), 'public', 'example', 'models', 'dae')
    const files = await fs.readdir(modelsDir)
    
    const daeFiles = files
      .filter(file => file.endsWith('.dae'))
      .map(file => ({
        name: path.basename(file, '.dae'),
        path: `/example/models/dae/${file}`
      }))

    return NextResponse.json(daeFiles)
  } catch (error) {
    console.error('Failed to read models directory:', error)
    return NextResponse.json(
      { error: 'Failed to load models' },
      { status: 500 }
    )
  }
} 