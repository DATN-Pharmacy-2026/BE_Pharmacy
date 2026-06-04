import { Injectable } from '@nestjs/common';
import { CommercePrismaService } from '../../prisma/commerce-prisma.service';
import { AskChatbotDto } from './dto/ask-chatbot.dto';
import { HandoffChatbotDto } from './dto/handoff-chatbot.dto';
import { IngestDocumentDto } from './dto/ingest-chatbot.dto';

type RagDocument = {
  id: string;
  title: string;
  content: string;
  category: string;
  source: string;
};

@Injectable()
export class ChatbotService {
  private readonly customDocuments: RagDocument[] = [];

  constructor(private readonly prisma: CommercePrismaService) {}

  async ask(dto: AskChatbotDto) {
    const topK = dto.topK ?? 3;
    const corpus = await this.buildCorpus();
    const ranked = this.rankDocuments(dto.query, corpus).slice(0, topK);
    const hasLowConfidence = ranked.length === 0 || ranked[0].score < 0.05;
    const answer = this.buildAnswer(dto.query, ranked, hasLowConfidence);

    return {
      answer,
      handoffSuggested: this.shouldSuggestHandoff(dto.query, hasLowConfidence),
      sources: ranked.map((item) => ({
        id: item.doc.id,
        title: item.doc.title,
        category: item.doc.category,
        source: item.doc.source,
        snippet: this.toSnippet(item.doc.content),
        score: Number(item.score.toFixed(4)),
      })),
    };
  }

  ingest(documents: IngestDocumentDto[]) {
    const map = new Map<string, RagDocument>(this.customDocuments.map((d) => [d.id, d]));
    for (const doc of documents) {
      map.set(doc.id, {
        id: doc.id,
        title: doc.title,
        content: doc.content,
        category: doc.category ?? 'faq',
        source: doc.source ?? 'manual-ingest',
      });
    }
    this.customDocuments.splice(0, this.customDocuments.length, ...map.values());
    return {
      message: 'Ingest completed',
      totalDocuments: this.customDocuments.length,
    };
  }

  handoff(dto: HandoffChatbotDto) {
    const ticketCode = `HS-${Date.now().toString().slice(-8)}`;
    return {
      message: 'Handoff request created',
      ticketCode,
      status: 'PENDING_PHARMACIST',
      estimatedContactMinutes: 15,
      customer: {
        name: dto.customerName ?? null,
        phone: dto.phone ?? null,
        email: dto.email ?? null,
      },
    };
  }

  private async buildCorpus(): Promise<RagDocument[]> {
    const defaults: RagDocument[] = [
      {
        id: 'policy-shipping',
        title: 'Ch?nh s?ch giao hang',
        content:
          'Don noi thanh duoc giao trong 2-4 gio. Don ngoai thanh du kien 2-3 ngay. Don tu 500000 VND duoc mien phi giao hang.',
        category: 'policy',
        source: 'pharmacy-policy',
      },
      {
        id: 'policy-payment',
        title: 'Ph??ng th?c thanh to?n',
        content:
          'Nh? thu?c ho tro COD, chuyen khoan ngan hang, vi dien tu va cong thanh toan truc tuyen.',
        category: 'policy',
        source: 'pharmacy-policy',
      },
      {
        id: 'safety-antibiotic',
        title: 'Canh bao thuoc ke don',
        content:
          'Khang sinh nhu Amoxicillin la thuoc ke don. Can dung theo chi dinh bac si, khong tu y tang giam lieu va can uong du lieu trinh.',
        category: 'safety',
        source: 'pharmacy-safety',
      },
      {
        id: 'symptom-cough',
        title: 'Huong dan trieu chung ho dau hong',
        content:
          'Truong hop ho dau hong nhe co the tham khao vien ngam, siro thao duoc, nuoc suc hong. Neu sot cao, kho tho hoac keo dai qua 3-5 ngay can gap bac si.',
        category: 'otc-guidance',
        source: 'pharmacy-guidance',
      },
    ];

    const products = await this.prisma.product.findMany({
      where: { deletedAt: null, status: 'ACTIVE' as any },
      select: {
        id: true,
        name: true,
        sku: true,
        description: true,
        activeIngredient: true,
        basePrice: true,
      },
      take: 120,
      orderBy: { updatedAt: 'desc' },
    });

    const productDocs: RagDocument[] = products.map((p) => ({
      id: `product-${p.id}`,
      title: `S?n ph?m ${p.name}`,
      category: 'product',
      source: `product:${p.sku ?? p.id}`,
      content: [
        `Ten: ${p.name}`,
        p.activeIngredient ? `Hoat chat: ${p.activeIngredient}` : '',
        p.description ? `Mo ta: ${p.description}` : '',
        `Gia tham khao: ${Number(p.basePrice)} VND`,
      ]
        .filter(Boolean)
        .join('. '),
    }));

    return [...defaults, ...this.customDocuments, ...productDocs];
  }

  private rankDocuments(query: string, docs: RagDocument[]) {
    const qTokens = this.tokenize(query);
    return docs
      .map((doc) => {
        const dTokens = this.tokenize(`${doc.title} ${doc.content}`);
        const score = this.jaccardScore(qTokens, dTokens);
        return { doc, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);
  }

  private tokenize(text: string): Set<string> {
    return new Set(
      text
        .toLowerCase()
        .replace(/[^a-z0-9\u00C0-\u1EF9\s]/g, ' ')
        .split(/\s+/)
        .map((t) => t.trim())
        .filter((t) => t.length > 1),
    );
  }

  private jaccardScore(a: Set<string>, b: Set<string>): number {
    if (a.size === 0 || b.size === 0) return 0;
    let intersection = 0;
    for (const t of a) {
      if (b.has(t)) intersection += 1;
    }
    const union = a.size + b.size - intersection;
    return union === 0 ? 0 : intersection / union;
  }

  private buildAnswer(
    query: string,
    ranked: Array<{ doc: RagDocument; score: number }>,
    lowConfidence: boolean,
  ): string {
    if (lowConfidence) {
      return 'Toi chua du thong tin de tra loi chinh xac. Ban vui long de lai cau hoi cu the hon hoac chon chuyen duoc si de duoc ho tro.';
    }

    const top = ranked[0].doc;
    const isHighRisk = this.shouldEscalateMedical(query);
    const safetyNote = isHighRisk
      ? 'Canh bao an toan: Trieu chung co dau hieu nghiem trong. Ban nen di kham bac si som nhat.'
      : 'L?u ?: Thong tin chi mang tinh tham khao. Vui long tham khao duoc si/bac si truoc khi dung thuoc.';

    return `${this.toSnippet(top.content)}. ${safetyNote}`;
  }

  private shouldEscalateMedical(query: string): boolean {
    const q = query.toLowerCase();
    return (
      q.includes('kho tho') ||
      q.includes('tuc nguc') ||
      q.includes('sot cao') ||
      q.includes('co giat') ||
      q.includes('xuat huyet')
    );
  }

  private shouldSuggestHandoff(query: string, lowConfidence: boolean): boolean {
    const q = query.toLowerCase();
    return lowConfidence || q.includes('duoc si') || this.shouldEscalateMedical(q);
  }

  private toSnippet(text: string): string {
    const clean = text.replace(/\s+/g, ' ').trim();
    return clean.length <= 260 ? clean : `${clean.slice(0, 257)}...`;
  }
}
