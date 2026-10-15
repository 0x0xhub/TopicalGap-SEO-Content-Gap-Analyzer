import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import Papa from 'papaparse';
import { parseGscBundle } from '@/lib/seo-engine';

export async function GET() {
  try {
    const candidateFiles = [
      'طلبات البحث.csv',
      'الصفحات.csv',
      'البلدان.csv',
      'الأجهزة.csv',
      'الفلاتر.csv',
      'رسم بياني.csv',
      'شكل الظهور في البحث.csv'
    ];

    const parsedFiles: { name: string; data: Record<string, unknown>[] }[] = [];

    for (const fileName of candidateFiles) {
      const filePath = path.join(process.cwd(), fileName);
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const parsed = Papa.parse(fileContent, { header: true, skipEmptyLines: true });
        parsedFiles.push({
          name: fileName,
          data: parsed.data as Record<string, unknown>[]
        });
      }
    }

    if (parsedFiles.length === 0) {
      return NextResponse.json({ error: 'No workspace CSV files found' }, { status: 404 });
    }

    const bundle = parseGscBundle(parsedFiles);

    return NextResponse.json({
      success: true,
      bundle,
      parsedFilesCount: parsedFiles.length
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load workspace files' }, { status: 500 });
  }
}
