import { Injectable } from '@nestjs/common';
import { InternalIntentResult } from './internal-intent.types';

@Injectable()
export class InternalIntentService {
  detect(message: string): InternalIntentResult {
    const normalizedMessage = this.normalize(message);
    const orderNo = this.extractOrderNo(message);

    if (orderNo) {
      return {
        intent: orderNo.startsWith('ORD-') ? 'order.lookup' : 'pos.order_lookup',
        normalizedMessage,
        orderNo,
      };
    }

    if (this.hasAny(normalizedMessage, ['ca pos', 'ca dang mo', 'nhan vien dang mo ca'])) {
      return { intent: 'pos.open_session', normalizedMessage };
    }

    if (this.hasAny(normalizedMessage, ['sap het hang', 'ton thap'])) {
      return { intent: 'inventory.low_stock', normalizedMessage };
    }

    if (this.hasAny(normalizedMessage, ['gan het han', 'het han', ' lo '])) {
      return { intent: 'inventory.expiring', normalizedMessage };
    }

    if (this.hasAny(normalizedMessage, ['trang thai don', 'don hang', 'order'])) {
      return {
        intent: 'order.status',
        normalizedMessage,
        extractedKeyword: this.extractKeyword(normalizedMessage),
      };
    }

    if (this.hasAny(normalizedMessage, ['con hang', 'ton kho', 'con bao nhieu'])) {
      return {
        intent: 'inventory.lookup',
        normalizedMessage,
        extractedKeyword: this.extractKeyword(normalizedMessage),
      };
    }

    if (this.hasAny(normalizedMessage, ['gia', 'bao nhieu tien'])) {
      return {
        intent: 'product.price',
        normalizedMessage,
        extractedKeyword: this.extractKeyword(normalizedMessage),
      };
    }

    if (normalizedMessage.length > 0) {
      return {
        intent: 'product.lookup',
        normalizedMessage,
        extractedKeyword: this.extractKeyword(normalizedMessage),
      };
    }

    return { intent: 'unknown', normalizedMessage };
  }

  private extractOrderNo(message: string): string | undefined {
    const match = message.match(/\b(?:ORD|POS)-[A-Z0-9-]+\b/i);
    return match?.[0]?.toUpperCase();
  }

  private extractKeyword(normalizedMessage: string): string {
    const cleaned = normalizedMessage
      .replace(
        /\b(gia|bao nhieu tien|bao nhieu|con hang khong|con bao nhieu|ton kho|hang|cho toi biet|kiem tra|trang thai don|don hang|ca pos|ca dang mo|nhan vien dang mo ca)\b/g,
        ' ',
      )
      .replace(/\s+/g, ' ')
      .trim();

    return cleaned;
  }

  private hasAny(value: string, patterns: string[]): boolean {
    return patterns.some((pattern) => value.includes(pattern));
  }

  private normalize(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, ' ')
      .replace(/\s+/g, ' ');
  }
}
