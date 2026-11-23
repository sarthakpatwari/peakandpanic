import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const TRACKED = ['fiscal-data.json', 'macro-data.json', 'rbi-data.json'];
  let latest = 0;

  for (const f of TRACKED) {
    try {
      const stats = fs.statSync(path.join(process.cwd(), f));
      latest = Math.max(latest, stats.mtimeMs);
    } catch {
      // file might not exist yet
    }
  }

  return NextResponse.json({
    updatedAt: latest ? new Date(latest).toISOString() : new Date().toISOString(),
  });
}