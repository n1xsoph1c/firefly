// src/app/api/test-accel/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const headers = new Headers();
  headers.set(
    'X-Accel-Redirect',
    '/internal/files/folders/Testfolder/20250510-0546-05.8010032-338d7a5d.mp4'
  );
  headers.set('Content-Type', 'video/mp4');

  return new NextResponse(null, { status: 200, headers });
}
