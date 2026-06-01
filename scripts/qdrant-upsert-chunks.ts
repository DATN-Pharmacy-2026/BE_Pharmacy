import * as fs from 'node:fs';
import * as path from 'node:path';
import { IngestChunk } from '../apps/chatbot-service/src/modules/ingest/ingest.types';
import { VectorStoreService } from '../apps/chatbot-service/src/modules/rag/vector-store.service';

function parseArg(flag: string): string | undefined {
  const idx = process.argv.findIndex((x) => x === flag);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  return undefined;
}

function mainPath(): string {
  const fallback = path.resolve(
    __dirname,
    '../apps/chatbot-service/knowledge-base/chunks.json',
  );
  return path.resolve(parseArg('--file') ?? fallback);
}

function hashToIntId(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash || 1;
}

async function main(): Promise<void> {
  const file = mainPath();
  if (!fs.existsSync(file)) {
    throw new Error(`chunks.json not found: ${file}`);
  }
  const chunks = JSON.parse(fs.readFileSync(file, 'utf-8')) as IngestChunk[];
  if (!chunks.length) {
    throw new Error('chunks.json has no data');
  }

  const withEmbedding = chunks.filter((c) => Array.isArray(c.embedding) && c.embedding.length > 0);
  if (!withEmbedding.length) {
    throw new Error('No embedding found in chunks.json. Run chatbot:ingest:embeddings first.');
  }

  const vectorSize = withEmbedding[0].embedding!.length;
  const store = new VectorStoreService();
  await store.ensureCollection(vectorSize);

  await store.upsertChunks(
    withEmbedding.map((c) => ({
      id: hashToIntId(c.id),
      embedding: c.embedding!,
      payload: {
        id: c.id,
        title: c.title,
        category: c.category,
        source: c.source,
        chunkIndex: c.chunkIndex,
        content: c.content,
      },
    })),
  );

  console.log('[DONE] qdrant upsert');
  console.log(`collection=${store.getCollectionName()}`);
  console.log(`points=${withEmbedding.length}`);
  console.log(`vectorSize=${vectorSize}`);
}

main().catch((error) => {
  console.error('[ERROR] qdrant upsert failed:', error.message ?? error);
  process.exit(1);
});
