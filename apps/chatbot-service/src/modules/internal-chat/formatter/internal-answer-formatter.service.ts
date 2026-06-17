import { Injectable } from '@nestjs/common';
import { InternalChatResponseDto } from '../dto/internal-chat-response.dto';
import { InternalChatIntent, InternalChatMode, ToolResult } from '../intent/internal-intent.types';

@Injectable()
export class InternalAnswerFormatterService {
  format(intent: InternalChatIntent, toolResults: ToolResult[]): InternalChatResponseDto {
    const warnings = this.unique(toolResults.flatMap((result) => result.warnings));
    const dataSources = this.unique(
      toolResults.flatMap((result) => result.dataSources),
    );

    return {
      answer: this.buildAnswer(intent, toolResults),
      intent,
      mode: InternalChatMode.RULE_BASED,
      toolResults,
      dataSources,
      warnings,
      requiresHuman: false,
    };
  }

  private buildAnswer(intent: InternalChatIntent, toolResults: ToolResult[]): string {
    switch (intent) {
      case 'product.price':
        return this.formatProductPrice(toolResults[0]);
      case 'product.lookup':
        return this.formatProductLookup(toolResults[0]);
      case 'inventory.lookup':
        return this.formatInventoryLookup(toolResults[0]);
      case 'inventory.low_stock':
        return this.formatInventoryLowStock(toolResults[0]);
      case 'inventory.expiring':
        return this.formatInventoryExpiring(toolResults[0]);
      case 'order.lookup':
      case 'order.status':
        return this.formatOrderLookup(toolResults);
      case 'pos.open_session':
        return this.formatPosOpenSession(toolResults[0]);
      case 'pos.order_lookup':
        return this.formatPosOrderLookup(toolResults[0]);
      case 'report.snapshot':
        return 'So lieu hien dang lay tu dashboard snapshot, co the chua phai du lieu live.';
      case 'unknown':
      default:
        return "Toi chua hieu yeu cau nay. Ban co the hoi: 'Panadol con bao nhieu hang?', 'Don ORD-xxx trang thai gi?', hoac 'San pham nao sap het hang?'.";
    }
  }

  private formatProductPrice(result?: ToolResult): string {
    const items = ((result?.data?.items as Array<Record<string, unknown>> | undefined) ?? []);
    const keyword = String(result?.data?.keyword ?? '');

    if (items.length === 0) {
      return `Khong tim thay san pham phu hop voi tu khoa '${keyword}'.`;
    }

    const product = items[0];
    return `${String(product.name)} hien co gia ban ${this.formatCurrency(product.basePrice)}.`;
  }

  private formatProductLookup(result?: ToolResult): string {
    const items = ((result?.data?.items as Array<Record<string, unknown>> | undefined) ?? []);
    const keyword = String(result?.data?.keyword ?? '');

    if (items.length === 0) {
      return `Khong tim thay san pham phu hop voi tu khoa '${keyword}'.`;
    }

    const names = items.slice(0, 3).map((item) => String(item.name));
    return `Tim thay ${items.length} san pham phu hop: ${names.join(', ')}.`;
  }

  private formatInventoryLookup(result?: ToolResult): string {
    const product = (result?.data?.product as Record<string, unknown> | undefined) ?? null;
    const inventoryItems =
      ((result?.data?.inventoryItems as Array<Record<string, unknown>> | undefined) ?? []);
    const totalAvailable = Number(result?.data?.totalAvailable ?? 0);
    const keyword = String(result?.data?.keyword ?? '');

    if (!product) {
      return `Khong tim thay san pham phu hop voi tu khoa '${keyword}'.`;
    }

    if (inventoryItems.length === 0) {
      return `${String(product.name)} hien chua co ton kho kha dung trong pham vi duoc phep.`;
    }

    const firstWarehouse = inventoryItems[0]?.warehouse as Record<string, unknown> | undefined;
    const warehouseLabel =
      String(firstWarehouse?.code ?? firstWarehouse?.name ?? 'kho duoc chon');

    return `${String(product.name)} hien con ${totalAvailable} san pham kha dung tai ${warehouseLabel}.`;
  }

  private formatInventoryLowStock(result?: ToolResult): string {
    const items = ((result?.data?.items as Array<Record<string, unknown>> | undefined) ?? []);
    const threshold = Number(result?.data?.threshold ?? 10);
    if (items.length === 0) {
      return 'Hien chua co san pham nao duoi nguong ton kho canh bao.';
    }

    const summaries = items.slice(0, 5).map((item, index) => {
      const name = String(item.productName ?? 'San pham chua xac dinh');
      const sku = String(item.productSku ?? '').trim();
      const qty = Number(item.quantityAvailable ?? 0);
      const unit = String(item.productUnit ?? '').trim();
      const thresholdValue = Number(item.minStockLevel ?? threshold);
      const qtyLabel = `${qty}${unit ? ` ${unit}` : ''}`;
      const skuLabel = sku ? ` - SKU ${sku}` : '';
      return `${index + 1}. ${name}${skuLabel} - con ${qtyLabel}, nguong canh bao ${thresholdValue}`;
    });

    return `Co ${items.length} san pham sap het hang:\n${summaries.join('\n')}`;
  }

  private formatInventoryExpiring(result?: ToolResult): string {
    const items = ((result?.data?.items as Array<Record<string, unknown>> | undefined) ?? []);
    if (items.length === 0) {
      return 'Hien chua co lo hang nao gan het han theo dieu kien kiem tra.';
    }

    const summaries = items.slice(0, 5).map((item, index) => {
      const productName = String(item.productName ?? 'San pham chua xac dinh');
      const sku = String(item.productSku ?? '').trim();
      const batch = (item.batch as Record<string, unknown> | undefined) ?? {};
      const batchNo = String(batch.batchNo ?? item.batchId ?? 'LO');
      const expiryDate = String(batch.expiryDate ?? item.expiryDate ?? '');
      const qty = Number(item.quantityAvailable ?? 0);
      const unit = String(item.productUnit ?? '').trim();
      const qtyLabel = `${qty}${unit ? ` ${unit}` : ''}`;
      const skuLabel = sku ? ` - SKU ${sku}` : '';
      return `${index + 1}. ${productName}${skuLabel} - lo ${batchNo}, het han ${this.formatDate(expiryDate)}, con ${qtyLabel}`;
    });

    return `Co ${items.length} lo gan het han:\n${summaries.join('\n')}`;
  }

  private formatOrderLookup(toolResults: ToolResult[]): string {
    const winningResult = toolResults.find((result) => {
      const order = result.data?.order;
      return result.success && !!order;
    });

    if (!winningResult) {
      const orderNo = String(toolResults[0]?.data?.orderNo ?? '');
      return `Khong tim thay don hang ${orderNo || 'phu hop'}.`;
    }

    const order = (winningResult.data?.order as Record<string, unknown>) ?? {};
    const orderNo = String(order.orderNo ?? winningResult.data?.orderNo ?? '');
    const status = String(order.status ?? 'UNKNOWN');
    const paymentStatus = String(order.paymentStatus ?? 'N/A');
    const fulfillmentStatus = String(order.fulfillmentStatus ?? 'N/A');
    const total = this.formatCurrency(order.grandTotal);

    return `Don ${orderNo} dang o trang thai ${status}, thanh toan ${paymentStatus}, giao nhan ${fulfillmentStatus}, tong tien ${total}.`;
  }

  private formatPosOpenSession(result?: ToolResult): string {
    const sessions =
      ((result?.data?.sessions as Array<Record<string, unknown>> | undefined) ?? []);

    if (sessions.length === 0) {
      return 'Hien tai khong co ca POS dang mo trong pham vi duoc phep.';
    }

    const session = sessions[0];
    const branch = (session.branch as Record<string, unknown> | undefined) ?? {};
    const branchName = String(branch.name ?? branch.code ?? 'chi nhanh duoc chon');

    return `Hien co ${sessions.length} ca POS dang mo tai ${branchName}. Ca duoc mo luc ${this.formatTime(String(session.openedAt ?? ''))}, trang thai ${String(session.status ?? 'OPEN')}.`;
  }

  private formatPosOrderLookup(result?: ToolResult): string {
    const order = (result?.data?.order as Record<string, unknown> | undefined) ?? null;
    const orderNo = String(result?.data?.orderNo ?? '');

    if (!order) {
      return `Khong tim thay don POS ${orderNo || 'phu hop'}.`;
    }

    return `Don POS ${String(order.orderNo ?? orderNo)} dang o trang thai ${String(order.status ?? 'UNKNOWN')}, tong tien ${this.formatCurrency(order.grandTotal)}.`;
  }

  private formatCurrency(value: unknown): string {
    const numberValue = Number(value ?? 0);
    return `${new Intl.NumberFormat('vi-VN').format(Math.round(numberValue))}d`;
  }

  private formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    const dd = `${date.getDate()}`.padStart(2, '0');
    const mm = `${date.getMonth() + 1}`.padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  private formatTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    const hh = `${date.getHours()}`.padStart(2, '0');
    const mm = `${date.getMinutes()}`.padStart(2, '0');
    return `${hh}:${mm}`;
  }

  private unique(values: string[]): string[] {
    return [...new Set(values.filter(Boolean))];
  }
}
