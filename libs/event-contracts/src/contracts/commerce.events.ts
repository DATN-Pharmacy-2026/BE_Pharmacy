export interface CommerceOrderCreatedPayload {
  orderId: string;
  orderCode?: string | null;
  customerUserId?: string | null;
  branchId?: string | null;
  warehouseId?: string | null;
  totalAmount: number;
  currency: string;
  paymentMethod: string;
  createdAt: string;
}

export interface CommerceOrderPaidPayload {
  orderId: string;
  paymentId?: string | null;
  transactionId?: string | null;
  provider?: string | null;
  amount: number;
  currency: string;
  paidAt: string;
  customerUserId?: string | null;
  branchId?: string | null;
  warehouseId?: string | null;
}
