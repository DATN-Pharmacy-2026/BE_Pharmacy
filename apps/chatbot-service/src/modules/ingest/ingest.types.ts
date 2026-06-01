export interface IngestChunk {
  id: string;
  title: string;
  category: 'faq' | 'policy' | 'medicine' | 'safety' | 'general';
  source: string;
  chunkIndex: number;
  content: string;
  metadata: {
    title: string;
    category: 'faq' | 'policy' | 'medicine' | 'safety' | 'general';
    source: string;
    chunkIndex: number;
  };
  embedding?: number[];
}

export interface IngestResult {
  filesRead: number;
  chunksCreated: number;
  outputPath: string;
  vectorDimensions?: number;
}
