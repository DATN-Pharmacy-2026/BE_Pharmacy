import { AuthenticatedUser } from '@app/auth';

export enum InternalChatMode {
  RULE_BASED = 'RULE_BASED',
  RAG = 'RAG',
  HYBRID = 'HYBRID',
}

export type InternalChatIntent =
  | 'product.lookup'
  | 'product.price'
  | 'inventory.lookup'
  | 'inventory.low_stock'
  | 'inventory.expiring'
  | 'order.lookup'
  | 'order.status'
  | 'pos.open_session'
  | 'pos.order_lookup'
  | 'report.snapshot'
  | 'unknown';

export type ToolResultType = Exclude<InternalChatIntent, 'unknown'>;

export interface InternalChatContext {
  branchId?: string;
  warehouseId?: string;
}

export interface InternalRequestHeaders {
  authorization?: string;
  correlationId?: string;
  requestId?: string;
}

export interface ToolInput {
  intent: InternalChatIntent;
  message: string;
  normalizedMessage: string;
  extractedKeyword?: string;
  orderNo?: string;
  context: InternalChatContext;
  user: AuthenticatedUser;
  requestHeaders: InternalRequestHeaders;
}

export interface ToolResult {
  success: boolean;
  type: ToolResultType;
  data: Record<string, unknown> | null;
  dataSources: string[];
  warnings: string[];
}

export interface InternalIntentResult {
  intent: InternalChatIntent;
  normalizedMessage: string;
  extractedKeyword?: string;
  orderNo?: string;
}

export interface InternalChatTool {
  execute(input: ToolInput): Promise<ToolResult>;
}
