-- CreateEnum
CREATE TYPE "NotificationEventType" AS ENUM ('SYSTEM', 'AUDIT', 'SETTINGS_CHANGED', 'REPORT_JOB_CREATED', 'REPORT_EXPORT_COMPLETED', 'REPORT_EXPORT_FAILED', 'LOW_STOCK', 'EXPIRING_BATCH', 'ORDER_CREATED', 'PAYMENT_UPDATED', 'POS_ORDER_CREATED', 'RECEIPT_CREATED', 'STORE_VERIFY_REQUIRED', 'CUSTOM');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'WEBSOCKET');

-- CreateEnum
CREATE TYPE "NotificationSeverity" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'ERROR', 'CRITICAL');

-- CreateEnum
CREATE TYPE "NotificationEventStatus" AS ENUM ('PENDING', 'DELIVERED', 'READ', 'FAILED', 'CANCELED');

-- CreateTable
CREATE TABLE "NotificationEvent" (
    "id" UUID NOT NULL,
    "type" "NotificationEventType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "severity" "NotificationSeverity" NOT NULL DEFAULT 'INFO',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "recipientUserId" UUID,
    "actorUserId" UUID,
    "branchId" UUID,
    "warehouseId" UUID,
    "sourceService" TEXT NOT NULL,
    "sourceModule" TEXT,
    "sourceEntityType" TEXT,
    "sourceEntityId" TEXT,
    "payload" JSONB,
    "status" "NotificationEventStatus" NOT NULL DEFAULT 'PENDING',
    "readAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotificationEvent_recipientUserId_idx" ON "NotificationEvent"("recipientUserId");

-- CreateIndex
CREATE INDEX "NotificationEvent_branchId_idx" ON "NotificationEvent"("branchId");

-- CreateIndex
CREATE INDEX "NotificationEvent_warehouseId_idx" ON "NotificationEvent"("warehouseId");

-- CreateIndex
CREATE INDEX "NotificationEvent_type_idx" ON "NotificationEvent"("type");

-- CreateIndex
CREATE INDEX "NotificationEvent_status_idx" ON "NotificationEvent"("status");

-- CreateIndex
CREATE INDEX "NotificationEvent_severity_idx" ON "NotificationEvent"("severity");

-- CreateIndex
CREATE INDEX "NotificationEvent_createdAt_idx" ON "NotificationEvent"("createdAt");

-- CreateIndex
CREATE INDEX "NotificationEvent_sourceService_sourceModule_idx" ON "NotificationEvent"("sourceService", "sourceModule");

-- CreateIndex
CREATE INDEX "NotificationEvent_sourceEntityType_sourceEntityId_idx" ON "NotificationEvent"("sourceEntityType", "sourceEntityId");
