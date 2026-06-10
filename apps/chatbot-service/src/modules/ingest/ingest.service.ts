import * as fs from 'node:fs';
import * as path from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import { IngestChunk, IngestResult } from './ingest.types';
import { EmbeddingService } from '../rag/embedding.service';

@Injectable()
export class IngestService {
  private readonly logger = new Logger(IngestService.name);
  private readonly embeddingService: EmbeddingService;

  constructor(embeddingService?: EmbeddingService) {
    this.embeddingService = embeddingService ?? new EmbeddingService();
  }

  ingestKnowledgeBase(baseDir: string, outputFile: string): IngestResult {
    const mdFiles = this.collectMarkdownFiles(baseDir);
    const chunks: IngestChunk[] = [];

    for (const absolutePath of mdFiles) {
      const relativePath = this.toRepoRelativePath(absolutePath);
      const raw = fs.readFileSync(absolutePath, 'utf-8');
      const cleaned = this.cleanMarkdown(raw);
      const title = this.extractTitle(raw, absolutePath);
      const category = this.detectCategory(relativePath);
      const parts = this.chunkText(cleaned, 700, 90);
      const sourceSlug = this.slugify(path.basename(absolutePath, '.md'));

      parts.forEach((content, idx) => {
        chunks.push({
          id: `${sourceSlug}_${String(idx + 1).padStart(3, '0')}`,
          title,
          category,
          source: relativePath,
          chunkIndex: idx + 1,
          content,
          metadata: {
            title,
            category,
            source: relativePath,
            chunkIndex: idx + 1,
          },
        });
      });
    }

    fs.mkdirSync(path.dirname(outputFile), { recursive: true });
    fs.writeFileSync(outputFile, JSON.stringify(chunks, null, 2), 'utf-8');

    this.logger.log(`Ingest completed. Files read: ${mdFiles.length}`);
    this.logger.log(`Chunks created: ${chunks.length}`);
    this.logger.log(`Output written: ${outputFile}`);

    return {
      filesRead: mdFiles.length,
      chunksCreated: chunks.length,
      outputPath: outputFile,
    };
  }

  async ingestKnowledgeBaseWithEmbeddings(
    baseDir: string,
    outputFile: string,
  ): Promise<IngestResult> {
    if (!this.embeddingService.hasApiKey()) {
      throw new Error(
        `${this.embeddingService.getProviderName().toUpperCase()} API key is missing. Cannot create embeddings.`,
      );
    }

    const base = this.ingestKnowledgeBase(baseDir, outputFile);
    const chunks = JSON.parse(
      fs.readFileSync(outputFile, 'utf-8'),
    ) as IngestChunk[];

    let vectorDimensions = 0;
    for (let i = 0; i < chunks.length; i += 1) {
      const chunk = chunks[i];
      const vector = await this.embeddingService.createEmbedding(
        chunk.content,
        'RETRIEVAL_DOCUMENT',
      );
      chunk.embedding = vector;
      if (!vectorDimensions) {
        vectorDimensions = vector.length;
        this.logger.log(`Embedding vector dimensions: ${vectorDimensions}`);
      }
      if ((i + 1) % 5 === 0 || i === chunks.length - 1) {
        this.logger.log(`Embedded ${i + 1}/${chunks.length} chunks`);
      }
    }

    fs.writeFileSync(outputFile, JSON.stringify(chunks, null, 2), 'utf-8');
    this.logger.log(`Embedding ingest output written: ${outputFile}`);

    return {
      ...base,
      vectorDimensions,
    };
  }

  private collectMarkdownFiles(rootDir: string): string[] {
    const out: string[] = [];
    const walk = (dir: string) => {
      for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, item.name);
        if (item.isDirectory()) {
          walk(full);
        } else if (item.isFile() && full.toLowerCase().endsWith('.md')) {
          out.push(full);
        }
      }
    };
    walk(rootDir);
    return out.sort();
  }

  private cleanMarkdown(input: string): string {
    let text = input;
    text = text.replace(/\r\n/g, '\n');
    text = text.replace(/```[\s\S]*?```/g, ' ');
    text = text.replace(/`([^`]+)`/g, '$1');
    text = text.replace(/!\[[^\]]*]\([^)]*\)/g, ' ');
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');
    text = text.replace(/^#{1,6}\s+/gm, '');
    text = text.replace(/^\s*[-*+]\s+/gm, '');
    text = text.replace(/^\s*\d+\.\s+/gm, '');
    text = text.replace(/\n{3,}/g, '\n\n');
    text = text.replace(/[ \t]{2,}/g, ' ');
    return text.trim();
  }

  private extractTitle(raw: string, filePath: string): string {
    const firstHeading = raw.match(/^#\s+(.+)$/m)?.[1]?.trim();
    if (firstHeading) {
      return firstHeading;
    }
    return path.basename(filePath, '.md');
  }

  private detectCategory(relativePath: string): IngestChunk['category'] {
    const normalized = relativePath.replace(/\\/g, '/');
    if (normalized.includes('/faq/')) return 'faq';
    if (normalized.includes('/policies/')) return 'policy';
    if (normalized.includes('/medicines/')) return 'medicine';
    if (normalized.includes('/safety/')) return 'safety';
    return 'general';
  }

  private chunkText(text: string, maxChars: number, overlap: number): string[] {
    const paragraphs = text
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);

    const chunks: string[] = [];
    let current = '';

    for (const para of paragraphs) {
      const next = current ? `${current}\n\n${para}` : para;
      if (next.length <= maxChars) {
        current = next;
        continue;
      }

      if (current) {
        chunks.push(current);
        const tail = current.slice(Math.max(0, current.length - overlap));
        current = `${tail}\n\n${para}`.trim();
      } else {
        let offset = 0;
        while (offset < para.length) {
          const piece = para.slice(offset, offset + maxChars);
          chunks.push(piece.trim());
          offset += maxChars - overlap;
        }
        current = '';
      }
    }

    if (current) {
      chunks.push(current.trim());
    }

    return chunks.filter((c) => c.length >= 40);
  }

  private slugify(input: string): string {
    return input
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 80);
  }

  private toRepoRelativePath(absolutePath: string): string {
    const repoRoot = path.resolve(__dirname, '../../../../../..');
    const relative = path.relative(repoRoot, absolutePath);
    return relative.replace(/\\/g, '/');
  }
}
