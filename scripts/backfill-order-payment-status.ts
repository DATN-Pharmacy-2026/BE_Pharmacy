import { PrismaClient, PaymentGatewayTransactionStatus, PaymentMethod, PaymentStatus, OrderStatus } from '.prisma/client/commerce';

type Mode = 'check' | 'apply';

type BrokenOrder = {
  id: string;
  orderNo: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  createdAt: Date;
  updatedAt: Date;
  payments: Array<{
    id: string;
    method: PaymentMethod;
    provider: string | null;
    status: PaymentStatus;
    paidAt: Date | null;
    transactionNo: string | null;
    createdAt: Date;
  }>;
  gatewayTransactions: Array<{
    id: string;
    provider: string;
    status: PaymentGatewayTransactionStatus;
    paidAt: Date | null;
    providerTransactionId: string | null;
    providerOrderId: string;
    paymentId: string | null;
    orderId: string | null;
    createdAt: Date;
  }>;
};

const prisma = new PrismaClient();

function parseMode(): Mode {
  return process.argv.includes('--apply') ? 'apply' : 'check';
}

function getPrimaryPayment(order: BrokenOrder) {
  return order.payments
    .slice()
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0];
}

function isCodLike(method?: PaymentMethod) {
  return method === PaymentMethod.COD;
}

function hasOnlineSuccessEvidence(order: BrokenOrder) {
  return order.gatewayTransactions.some(
    (transaction) =>
      transaction.status === PaymentGatewayTransactionStatus.PAID &&
      !!transaction.providerTransactionId,
  );
}

function summarizeByMethod(orders: BrokenOrder[]) {
  return orders.reduce<Record<string, number>>((acc, order) => {
    const method = getPrimaryPayment(order)?.method ?? 'NO_PAYMENT';
    acc[method] = (acc[method] ?? 0) + 1;
    return acc;
  }, {});
}

async function loadBrokenOrders() {
  return prisma.onlineOrder.findMany({
    where: {
      status: OrderStatus.COMPLETED,
      paymentStatus: { not: PaymentStatus.PAID },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      payments: {
        select: {
          id: true,
          method: true,
          provider: true,
          status: true,
          paidAt: true,
          transactionNo: true,
          createdAt: true,
        },
      },
      gatewayTransactions: {
        select: {
          id: true,
          provider: true,
          status: true,
          paidAt: true,
          providerTransactionId: true,
          providerOrderId: true,
          paymentId: true,
          orderId: true,
          createdAt: true,
        },
      },
    },
  }) as Promise<BrokenOrder[]>;
}

async function run() {
  const mode = parseMode();
  console.log(`[backfill-order-payment-status] mode=${mode}`);

  const brokenOrders = await loadBrokenOrders();
  const codCandidates = brokenOrders.filter((order) =>
    isCodLike(getPrimaryPayment(order)?.method),
  );
  const onlineCandidates = brokenOrders.filter(
    (order) => !isCodLike(getPrimaryPayment(order)?.method),
  );
  const onlineWithEvidence = onlineCandidates.filter(hasOnlineSuccessEvidence);
  const onlineManualReview = onlineCandidates.filter(
    (order) => !hasOnlineSuccessEvidence(order),
  );

  console.log(
    JSON.stringify(
      {
        summary: {
          totalBroken: brokenOrders.length,
          byPaymentMethod: summarizeByMethod(brokenOrders),
          codCandidates: codCandidates.length,
          onlineCandidates: onlineCandidates.length,
          onlineWithSuccessEvidence: onlineWithEvidence.length,
          onlineManualReview: onlineManualReview.length,
        },
        brokenOrders: brokenOrders.map((order) => ({
          orderId: order.id,
          orderNo: order.orderNo,
          orderStatus: order.status,
          paymentStatus: order.paymentStatus,
          paymentMethod: getPrimaryPayment(order)?.method ?? 'NO_PAYMENT',
          paymentRecordStatus: getPrimaryPayment(order)?.status ?? 'NO_PAYMENT',
          gatewayStatuses: order.gatewayTransactions.map((transaction) => ({
            id: transaction.id,
            provider: transaction.provider,
            status: transaction.status,
            providerTransactionId: transaction.providerTransactionId,
          })),
        })),
      },
      null,
      2,
    ),
  );

  if (mode !== 'apply') {
    return;
  }

  let codFixed = 0;
  let onlineFixed = 0;

  for (const order of codCandidates) {
    await prisma.$transaction(async (tx) => {
      await tx.onlineOrder.update({
        where: { id: order.id },
        data: { paymentStatus: PaymentStatus.PAID },
      });
      await tx.payment.updateMany({
        where: { onlineOrderId: order.id },
        data: { status: PaymentStatus.PAID, paidAt: new Date() },
      });
    });
    codFixed += 1;
  }

  for (const order of onlineWithEvidence) {
    await prisma.$transaction(async (tx) => {
      await tx.onlineOrder.update({
        where: { id: order.id },
        data: { paymentStatus: PaymentStatus.PAID },
      });
      await tx.payment.updateMany({
        where: { onlineOrderId: order.id },
        data: { status: PaymentStatus.PAID, paidAt: new Date() },
      });
    });
    onlineFixed += 1;
  }

  const remainingBrokenOrders = await loadBrokenOrders();

  console.log(
    JSON.stringify(
      {
        result: {
          codFixed,
          onlineFixed,
          onlineManualReview: onlineManualReview.length,
          remainingBroken: remainingBrokenOrders.length,
          remainingByPaymentMethod: summarizeByMethod(remainingBrokenOrders),
        },
      },
      null,
      2,
    ),
  );
}

run()
  .catch((error) => {
    console.error('[backfill-order-payment-status] failed');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
