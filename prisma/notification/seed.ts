import {
  NotificationChannel,
  PrismaClient,
} from '../../node_modules/.prisma/client/notification';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const templates = [
    {
      code: 'WELCOME_EMAIL',
      name: 'Welcome Email',
      channel: NotificationChannel.EMAIL,
      subjectTemplate: 'Welcome to Pharmacy Platform',
      bodyTemplate: 'Hello {{fullName}}, welcome to Pharmacy Platform.',
    },
    {
      code: 'PASSWORD_RESET',
      name: 'Password Reset',
      channel: NotificationChannel.EMAIL,
      subjectTemplate: 'Password Reset Request',
      bodyTemplate: 'Hello {{fullName}}, use this link to reset your password: {{resetLink}}',
    },
    {
      code: 'ORDER_CONFIRMATION',
      name: 'Order Confirmation',
      channel: NotificationChannel.EMAIL,
      subjectTemplate: 'Order {{orderNo}} Confirmed',
      bodyTemplate: 'Your order {{orderNo}} has been confirmed.',
    },
    {
      code: 'LOW_INVENTORY_ALERT',
      name: 'Low Inventory Alert',
      channel: NotificationChannel.WEBSOCKET,
      subjectTemplate: null,
      bodyTemplate: 'Product {{productName}} is below threshold at warehouse {{warehouseName}}.',
    },
    {
      code: 'TRANSFER_SHIPMENT_ALERT',
      name: 'Transfer Shipment Alert',
      channel: NotificationChannel.WEBSOCKET,
      subjectTemplate: null,
      bodyTemplate: 'Transfer {{transferNo}} shipment status updated: {{status}}.',
    },
  ];

  for (const template of templates) {
    await prisma.notificationTemplate.upsert({
      where: { code: template.code },
      update: {
        name: template.name,
        channel: template.channel,
        subjectTemplate: template.subjectTemplate,
        bodyTemplate: template.bodyTemplate,
        isActive: true,
      },
      create: {
        code: template.code,
        name: template.name,
        channel: template.channel,
        subjectTemplate: template.subjectTemplate,
        bodyTemplate: template.bodyTemplate,
        isActive: true,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
