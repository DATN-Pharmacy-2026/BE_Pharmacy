import * as path from 'node:path';
import './load-chatbot-env';
import { IngestService } from '../apps/chatbot-service/src/modules/ingest/ingest.service';

function parseArg(flag: string): string | undefined {
  const idx = process.argv.findIndex((x) => x === flag);
  if (idx >= 0 && process.argv[idx + 1]) {
    return process.argv[idx + 1];
  }
  return undefined;
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

async function main(): Promise<void> {
  const defaultKbDir = path.resolve(__dirname, '../../knowledge-base');
  const defaultOutFile = path.resolve(
    __dirname,
    '../apps/chatbot-service/knowledge-base/chunks.json',
  );

  const kbDir = path.resolve(parseArg('--kbDir') ?? defaultKbDir);
  const outFile = path.resolve(parseArg('--out') ?? defaultOutFile);
  const withEmbeddings = hasFlag('--withEmbeddings');

  const ingestService = new IngestService();
  const result = withEmbeddings
    ? await ingestService.ingestKnowledgeBaseWithEmbeddings(kbDir, outFile)
    : ingestService.ingestKnowledgeBase(kbDir, outFile);

  console.log('[DONE] chatbot ingest');
  console.log(`[MODE] embeddings=${withEmbeddings}`);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error('[ERROR] chatbot ingest failed:', error.message ?? error);
  process.exit(1);
});
