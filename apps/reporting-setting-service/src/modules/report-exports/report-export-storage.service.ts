import { Injectable } from '@nestjs/common';
import { existsSync, mkdirSync } from 'fs';
import { promises as fs } from 'fs';
import { basename, join, resolve } from 'path';

@Injectable()
export class ReportExportStorageService {
  private readonly rootDir = resolve(
    process.cwd(),
    process.env.REPORT_EXPORT_STORAGE_DIR ?? 'storage/report-exports',
  );

  constructor() {
    if (!existsSync(this.rootDir)) {
      mkdirSync(this.rootDir, { recursive: true });
    }
  }

  getRootDir(): string {
    return this.rootDir;
  }

  async writeFile(
    reportJobId: string,
    fileName: string,
    buffer: Buffer,
  ): Promise<string> {
    const safeFileName = this.sanitizeFileName(fileName);
    const folder = join(this.rootDir, reportJobId);
    await fs.mkdir(folder, { recursive: true });
    const fullPath = join(folder, safeFileName);
    await fs.writeFile(fullPath, buffer);
    return fullPath;
  }

  resolveExportPath(reportJobId: string, fileName: string): string {
    const safeFileName = this.sanitizeFileName(fileName);
    const fullPath = resolve(this.rootDir, reportJobId, safeFileName);
    if (!fullPath.startsWith(this.rootDir)) {
      throw new Error('Invalid export file path');
    }
    return fullPath;
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  sanitizeFileName(fileName: string): string {
    const base = basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
    const hasKnownExt = base.endsWith('.xlsx') || base.endsWith('.csv');
    const normalized = hasKnownExt ? base : `${base}.xlsx`;
    if (normalized.length === 0 || normalized === '.xlsx' || normalized === '.csv') {
      return `report_${Date.now()}.xlsx`;
    }
    return normalized;
  }
}
