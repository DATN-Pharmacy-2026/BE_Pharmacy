import {
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthenticatedUser } from '@app/auth';
import { InternalChatRequestDto } from './dto/internal-chat-request.dto';
import { InternalChatResponseDto } from './dto/internal-chat-response.dto';
import { InternalAnswerFormatterService } from './formatter/internal-answer-formatter.service';
import {
  InternalChatContext,
  InternalRequestHeaders,
  ToolInput,
} from './intent/internal-intent.types';
import { InternalIntentService } from './intent/internal-intent.service';
import { ToolRouterService } from './tools/tool-router.service';

const ADMIN_ROLE_CODES = new Set([
  'ADMIN',
  'SUPER_ADMIN',
  'COMPANY_ADMIN',
]);

const STAFF_ROLE_CODES = new Set([
  'EMPLOYEE',
  'PHARMACIST',
  'BRANCH_MANAGER',
  'CASHIER',
  'INVENTORY_MANAGER',
  'REPORT_VIEWER',
  'CUSTOMER_SERVICE',
]);

@Injectable()
export class InternalChatOrchestratorService {
  constructor(
    private readonly internalIntentService: InternalIntentService,
    private readonly toolRouterService: ToolRouterService,
    private readonly internalAnswerFormatterService: InternalAnswerFormatterService,
  ) {}

  async chat(
    user: AuthenticatedUser,
    dto: InternalChatRequestDto,
    headers: InternalRequestHeaders,
  ): Promise<InternalChatResponseDto> {
    this.assertInternalUser(user);

    const intentResult = this.internalIntentService.detect(dto.message);
    const context = this.resolveContext(user, dto.context ?? {}, intentResult.intent);
    const toolInput: ToolInput = {
      intent: intentResult.intent,
      message: dto.message.trim(),
      normalizedMessage: intentResult.normalizedMessage,
      extractedKeyword: intentResult.extractedKeyword,
      orderNo: intentResult.orderNo,
      context,
      user,
      requestHeaders: headers,
    };

    const toolResults = await this.toolRouterService.execute(toolInput);
    const response = this.internalAnswerFormatterService.format(
      intentResult.intent,
      toolResults,
    );

    if (toolResults.length === 0) {
      response.warnings = [];
      response.dataSources = [];
    }

    return response;
  }

  private assertInternalUser(user: AuthenticatedUser): void {
    if (user.isSystemAdmin) {
      return;
    }

    const roles = new Set(user.roles ?? []);
    const isAdmin = [...roles].some((role) => ADMIN_ROLE_CODES.has(role));
    const isStaff = [...roles].some((role) => STAFF_ROLE_CODES.has(role));

    if (!isAdmin && !isStaff) {
      throw new ForbiddenException('Only admin/staff can use internal chatbot');
    }
  }

  private resolveContext(
    user: AuthenticatedUser,
    requestedContext: InternalChatContext,
    intent: string,
  ): InternalChatContext {
    if (user.isSystemAdmin || user.roles.some((role) => ADMIN_ROLE_CODES.has(role))) {
      return requestedContext;
    }

    const branchId = this.resolveBranchId(user, requestedContext.branchId, intent);
    const warehouseId = this.resolveWarehouseId(
      user,
      requestedContext.warehouseId,
      intent,
    );

    return {
      branchId,
      warehouseId,
    };
  }

  private resolveBranchId(
    user: AuthenticatedUser,
    requestedBranchId: string | undefined,
    intent: string,
  ): string | undefined {
    if (requestedBranchId) {
      if (!user.branchIds.includes(requestedBranchId)) {
        throw new ForbiddenException('No branch access for requested branch');
      }
      return requestedBranchId;
    }

    if (this.requiresBranchScope(intent) && user.branchIds.length === 1) {
      return user.branchIds[0];
    }

    return undefined;
  }

  private resolveWarehouseId(
    user: AuthenticatedUser,
    requestedWarehouseId: string | undefined,
    intent: string,
  ): string | undefined {
    if (requestedWarehouseId) {
      if (!user.warehouseIds.includes(requestedWarehouseId)) {
        throw new ForbiddenException(
          'No warehouse access for requested warehouse',
        );
      }
      return requestedWarehouseId;
    }

    if (this.requiresWarehouseScope(intent) && user.warehouseIds.length === 1) {
      return user.warehouseIds[0];
    }

    return undefined;
  }

  private requiresBranchScope(intent: string): boolean {
    return [
      'inventory.lookup',
      'inventory.low_stock',
      'inventory.expiring',
      'order.lookup',
      'order.status',
      'pos.open_session',
      'pos.order_lookup',
      'report.snapshot',
    ].includes(intent);
  }

  private requiresWarehouseScope(intent: string): boolean {
    return ['inventory.lookup', 'inventory.low_stock', 'inventory.expiring'].includes(
      intent,
    );
  }
}
