import { Body, Controller, Post, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, Permissions, PermissionsGuard } from '@app/auth';
import { RagSearchDto } from './dto/rag-search.dto';
import { RagService } from './rag.service';
import { KnowledgeIndexService } from './knowledge-index.service';

@ApiBearerAuth()
@Controller(['rag', 'api/rag', 'api/chatbot/rag'])
export class RagController {
  constructor(
    private readonly ragService: RagService,
    private readonly knowledgeIndexService: KnowledgeIndexService,
  ) {}

  @Post('search')
  async search(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: RagSearchDto,
  ) {
    const query = dto.query.trim();
    const topK = dto.topK ?? 5;
    return this.ragService.search(query, topK);
  }

  @Post('reindex-products')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('admin.access|chatbot.internal.read')
  async reindexProducts() {
    return this.knowledgeIndexService.reindexProducts();
  }

  @Post('reindex-faq')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('admin.access|chatbot.internal.read')
  async reindexFaq() {
    return this.knowledgeIndexService.reindexFaq();
  }
}
