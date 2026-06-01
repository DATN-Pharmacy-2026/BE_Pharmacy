import { EmbeddingService } from '../apps/chatbot-service/src/modules/rag/embedding.service';
import { VectorStoreService } from '../apps/chatbot-service/src/modules/rag/vector-store.service';

function parseArg(flag: string): string | undefined {
  const idx = process.argv.findIndex((x) => x === flag);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  return undefined;
}

async function main(): Promise<void> {
  const query = parseArg('--query') || 'Tôi mua nhầm thuốc thì có trả lại được không?';
  const topK = Number(parseArg('--topK') || '5');

  const embeddingService = new EmbeddingService();
  if (!embeddingService.hasApiKey()) {
    throw new Error('OPENAI_API_KEY is missing. Cannot embed search query.');
  }

  const queryEmbedding = await embeddingService.createEmbedding(query);
  const vectorStore = new VectorStoreService();
  const results = await vectorStore.searchSimilar(queryEmbedding, topK);

  console.log('[DONE] qdrant search');
  console.log(`query="${query}" topK=${topK} results=${results.length}`);
  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error('[ERROR] qdrant search failed:', error.message ?? error);
  process.exit(1);
});
