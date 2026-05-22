-- CreateEnum
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "NotificationDeliveryAttempt" (
    "id" UUID NOT NULL,
    "notificationEventId" UUID NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationDeliveryStatus" NOT NULL,
    "provider" TEXT,
    "recipient" TEXT,
    "errorMessage" TEXT,
    "response" JSONB,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationDeliveryAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotificationDeliveryAttempt_notificationEventId_idx" ON "NotificationDeliveryAttempt"("notificationEventId");

-- CreateIndex
CREATE INDEX "NotificationDeliveryAttempt_channel_idx" ON "NotificationDeliveryAttempt"("channel");

-- CreateIndex
CREATE INDEX "NotificationDeliveryAttempt_status_idx" ON "NotificationDeliveryAttempt"("status");

-- CreateIndex
CREATE INDEX "NotificationDeliveryAttempt_attemptedAt_idx" ON "NotificationDeliveryAttempt"("attemptedAt");

-- CreateIndex
CREATE INDEX "NotificationDeliveryAttempt_provider_idx" ON "NotificationDeliveryAttempt"("provider");

-- AddForeignKey
ALTER TABLE "NotificationDeliveryAttempt" ADD CONSTRAINT "NotificationDeliveryAttempt_notificationEventId_fkey" FOREIGN KEY ("notificationEventId") REFERENCES "NotificationEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
