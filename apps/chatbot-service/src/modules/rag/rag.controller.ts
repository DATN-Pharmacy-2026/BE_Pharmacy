import { Body, Controller, Post, ValidationPipe } from '@nestjs/common';
import { RagSearchDto } from './dto/rag-search.dto';
import { RagService } from './rag.service';

@Controller(['rag', 'api/rag'])
export class RagController {
  constructor(private readonly ragService: RagService) {}

  @Post('search')
  async search(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: RagSearchDto,
  ) {
    const query = dto.query.trim();
    const topK = dto.topK ?? 5;
    return this.ragService.search(query, topK);
  }
}
