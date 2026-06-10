import { PrismaClient, PaymentStatus, OrderStatus } from '.prisma/client/commerce';

const prisma = new PrismaClient();

async function run() {
  const brokenOrders = await prisma.onlineOrder.findMany({
    where: {
      status: OrderStatus.COMPLETED,
      paymentStatus: { in: [PaymentStatus.PENDING, PaymentStatus.FAILED] },
    },
    select: {
      id: true,
      orderNo: true,
      status: true,
      paymentStatus: true,
      payments: {
        select: {
          method: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log(
    JSON.stringify(
      {
        total: brokenOrders.length,
        orders: brokenOrders.map((order) => ({
          id: order.id,
          orderNo: order.orderNo,
          status: order.status,
          paymentStatus: order.paymentStatus,
          paymentMethods: order.payments.map((payment) => payment.method),
          paymentRecordStatuses: order.payments.map((payment) => payment.status),
        })),
      },
      null,
      2,
    ),
  );
}

run()
  .catch((error) => {
    console.error('[check-order-payment-status] failed');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
