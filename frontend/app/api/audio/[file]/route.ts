import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { file: string } }
) {
  const { file } = params;
  const filePath = path.join(process.cwd(), '..', 'backend', 'data', 'shows', file);

  try {
    const fileBuffer = await fs.promises.readFile(filePath);
    
    return new Response(fileBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error(`Error reading file ${file}:`, error);
    return new Response('File not found', { status: 404 });
  }
}
