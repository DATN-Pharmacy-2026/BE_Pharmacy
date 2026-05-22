-- CreateEnum
CREATE TYPE "EventOutboxStatus" AS ENUM ('PENDING', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'CANCELED');

-- CreateEnum
CREATE TYPE "EventInboxStatus" AS ENUM ('RECEIVED', 'PROCESSING', 'PROCESSED', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "EventOutbox" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventVersion" INTEGER NOT NULL DEFAULT 1,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "sourceService" TEXT NOT NULL,
    "sourceModule" TEXT,
    "correlationId" TEXT,
    "causationId" TEXT,
    "idempotencyKey" TEXT,
    "branchId" UUID,
    "warehouseId" UUID,
    "actorUserId" UUID,
    "payload" JSONB NOT NULL,
    "metadata" JSONB,
    "status" "EventOutboxStatus" NOT NULL DEFAULT 'PENDING',
    "publishedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventInbox" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventVersion" INTEGER NOT NULL,
    "sourceService" TEXT NOT NULL,
    "consumerService" TEXT NOT NULL,
    "consumerName" TEXT NOT NULL,
    "aggregateType" TEXT,
    "aggregateId" TEXT,
    "correlationId" TEXT,
    "causationId" TEXT,
    "idempotencyKey" TEXT,
    "payload" JSONB,
    "status" "EventInboxStatus" NOT NULL DEFAULT 'RECEIVED',
    "processedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventInbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventOutbox_eventId_key" ON "EventOutbox"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "EventOutbox_idempotencyKey_key" ON "EventOutbox"("idempotencyKey");

-- CreateIndex
CREATE INDEX "EventOutbox_eventType_idx" ON "EventOutbox"("eventType");

-- CreateIndex
CREATE INDEX "EventOutbox_aggregateType_aggregateId_idx" ON "EventOutbox"("aggregateType", "aggregateId");

-- CreateIndex
CREATE INDEX "EventOutbox_sourceService_idx" ON "EventOutbox"("sourceService");

-- CreateIndex
CREATE INDEX "EventOutbox_status_idx" ON "EventOutbox"("status");

-- CreateIndex
CREATE INDEX "EventOutbox_createdAt_idx" ON "EventOutbox"("createdAt");

-- CreateIndex
CREATE INDEX "EventOutbox_publishedAt_idx" ON "EventOutbox"("publishedAt");

-- CreateIndex
CREATE INDEX "EventOutbox_correlationId_idx" ON "EventOutbox"("correlationId");

-- CreateIndex
CREATE INDEX "EventOutbox_branchId_idx" ON "EventOutbox"("branchId");

-- CreateIndex
CREATE INDEX "EventOutbox_warehouseId_idx" ON "EventOutbox"("warehouseId");

-- CreateIndex
CREATE INDEX "EventInbox_eventType_idx" ON "EventInbox"("eventType");

-- CreateIndex
CREATE INDEX "EventInbox_sourceService_idx" ON "EventInbox"("sourceService");

-- CreateIndex
CREATE INDEX "EventInbox_consumerService_idx" ON "EventInbox"("consumerService");

-- CreateIndex
CREATE INDEX "EventInbox_consumerName_idx" ON "EventInbox"("consumerName");

-- CreateIndex
CREATE INDEX "EventInbox_status_idx" ON "EventInbox"("status");

-- CreateIndex
CREATE INDEX "EventInbox_createdAt_idx" ON "EventInbox"("createdAt");

-- CreateIndex
CREATE INDEX "EventInbox_processedAt_idx" ON "EventInbox"("processedAt");

-- CreateIndex
CREATE INDEX "EventInbox_correlationId_idx" ON "EventInbox"("correlationId");

-- CreateIndex
CREATE INDEX "EventInbox_aggregateType_aggregateId_idx" ON "EventInbox"("aggregateType", "aggregateId");

-- CreateIndex
CREATE UNIQUE INDEX "EventInbox_eventId_consumerService_consumerName_key" ON "EventInbox"("eventId", "consumerService", "consumerName");
