import { InternalChatMode, InternalChatIntent, ToolResult } from '../intent/internal-intent.types';

export class InternalChatResponseDto {
  answer!: string;
  intent!: InternalChatIntent;
  mode!: InternalChatMode;
  toolResults!: ToolResult[];
  dataSources!: string[];
  warnings!: string[];
  requiresHuman!: boolean;
}
