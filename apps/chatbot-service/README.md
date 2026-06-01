# Chatbot Service (RAG Skeleton)

Microservice skeleton for Pharmacy Chatbot RAG.

## Scope in this phase
- Service bootstrapping only
- Module structure for later RAG implementation
- Health endpoint

No retrieval, LLM call, ingest, or safety logic is implemented yet.

## Structure
```text
apps/chatbot-service/
├── src/
│   ├── modules/
│   │   ├── chat/
│   │   ├── rag/
│   │   ├── ingest/
│   │   ├── safety/
│   │   ├── handoff/
│   │   └── conversation/
│   ├── health/
│   ├── app.module.ts
│   └── main.ts
├── .env.example
└── README.md
```

## Run
```bash
npm run start:chatbot
```

Dev watch:
```bash
npm run dev:chatbot
```

## Health check
- `GET /health`
- `GET /api/health`

Expected response:
```json
{
  "service": "chatbot-service",
  "status": "ok",
  "timestamp": "2026-06-01T00:00:00.000Z"
}
```

## Knowledge Base Ingest (Phase 3)
Run from `BE` root:

```bash
npm run chatbot:ingest
```

Output file:
- `apps/chatbot-service/knowledge-base/chunks.json`

Run with embeddings:
```bash
npm run chatbot:ingest:embeddings
```

Required env:
- `OPENAI_API_KEY`
- Optional: `OPENAI_EMBEDDING_MODEL` (default `text-embedding-3-small`)
- Optional: `OPENAI_BASE_URL` (default `https://api.openai.com/v1`)

## Qdrant Vector Store (Phase 5)
Start Qdrant:
```bash
docker compose up -d qdrant
```

Upsert chunks with embeddings:
```bash
npm run chatbot:vector:upsert
```

Search similar chunks:
```bash
npm run chatbot:vector:search -- --query "Tôi mua nhầm thuốc thì có trả lại được không?" --topK 5
```

Optional args:
```bash
npx ts-node scripts/ingest-chatbot-kb.ts --kbDir ..\knowledge-base --out .\apps\chatbot-service\knowledge-base\chunks.json
```
