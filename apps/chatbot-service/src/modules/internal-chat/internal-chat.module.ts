import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { InternalChatController } from './internal-chat.controller';
import { InternalChatOrchestratorService } from './internal-chat.orchestrator.service';
import { InternalIntentService } from './intent/internal-intent.service';
import { ToolRouterService } from './tools/tool-router.service';
import { ProductTool } from './tools/product.tool';
import { InventoryTool } from './tools/inventory.tool';
import { OrderTool } from './tools/order.tool';
import { PosTool } from './tools/pos.tool';
import { ReportTool } from './tools/report.tool';
import { CommerceClient } from './clients/commerce.client';
import { OperationClient } from './clients/operation.client';
import { ReportingClient } from './clients/reporting.client';
import { InternalAnswerFormatterService } from './formatter/internal-answer-formatter.service';

// TODO(phase-2): add RagSearchTool, LlmAnswerService, KnowledgeIndexService, HandoffService.
@Module({
  imports: [HttpModule],
  controllers: [InternalChatController],
  providers: [
    InternalChatOrchestratorService,
    InternalIntentService,
    ToolRouterService,
    ProductTool,
    InventoryTool,
    OrderTool,
    PosTool,
    ReportTool,
    CommerceClient,
    OperationClient,
    ReportingClient,
    InternalAnswerFormatterService,
  ],
})
export class InternalChatModule {}
