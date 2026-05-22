/*
  Warnings:

  - The values [INBOUND,OUTBOUND,ADJUSTMENT_IN,ADJUSTMENT_OUT,RESERVATION,RELEASE] on the enum `InventoryMovementType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `batchId` on the `StockMovement` table. All the data in the column will be lost.
  - You are about to drop the column `branchId` on the `StockMovement` table. All the data in the column will be lost.
  - Added the required column `afterQuantity` to the `StockMovement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `beforeQuantity` to the `StockMovement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `StockMovement` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EventOutboxStatus" AS ENUM ('PENDING', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'CANCELED');

-- CreateEnum
CREATE TYPE "EventInboxStatus" AS ENUM ('RECEIVED', 'PROCESSING', 'PROCESSED', 'FAILED', 'SKIPPED');

-- AlterEnum
BEGIN;
CREATE TYPE "InventoryMovementType_new" AS ENUM ('INITIAL_STOCK', 'INCREASE', 'DECREASE', 'ADJUSTMENT_INCREASE', 'ADJUSTMENT_DECREASE', 'TRANSFER_OUT', 'TRANSFER_IN', 'SALE_RESERVED', 'SALE_RELEASED', 'SALE_DECREASE');
ALTER TABLE "StockMovement" ALTER COLUMN "movementType" TYPE "InventoryMovementType_new" USING ("movementType"::text::"InventoryMovementType_new");
ALTER TYPE "InventoryMovementType" RENAME TO "InventoryMovementType_old";
ALTER TYPE "InventoryMovementType_new" RENAME TO "InventoryMovementType";
DROP TYPE "public"."InventoryMovementType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "StockMovement" DROP CONSTRAINT "StockMovement_warehouseId_fkey";

-- DropIndex
DROP INDEX "StockMovement_batchId_idx";

-- DropIndex
DROP INDEX "StockMovement_branchId_idx";

-- DropIndex
DROP INDEX "StockMovement_productId_warehouseId_createdAt_idx";

-- AlterTable
ALTER TABLE "StockMovement" DROP COLUMN "batchId",
DROP COLUMN "branchId",
ADD COLUMN     "afterQuantity" INTEGER NOT NULL,
ADD COLUMN     "beforeQuantity" INTEGER NOT NULL,
ADD COLUMN     "locationId" UUID,
ADD COLUMN     "reason" TEXT,
ADD COLUMN     "tenantId" UUID NOT NULL,
ALTER COLUMN "warehouseId" DROP NOT NULL,
ALTER COLUMN "referenceId" SET DATA TYPE TEXT;

-- CreateTable
CREATE TABLE "Inventory" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "warehouseId" UUID NOT NULL,
    "locationId" UUID,
    "productId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reservedQuantity" INTEGER NOT NULL DEFAULT 0,
    "availableQuantity" INTEGER NOT NULL,
    "minQuantity" INTEGER,
    "maxQuantity" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inventory_pkey" PRIMARY KEY ("id")
);

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
CREATE INDEX "Inventory_tenantId_warehouseId_idx" ON "Inventory"("tenantId", "warehouseId");

-- CreateIndex
CREATE INDEX "Inventory_tenantId_productId_idx" ON "Inventory"("tenantId", "productId");

-- CreateIndex
CREATE INDEX "Inventory_tenantId_locationId_idx" ON "Inventory"("tenantId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "Inventory_tenantId_warehouseId_locationId_productId_key" ON "Inventory"("tenantId", "warehouseId", "locationId", "productId");

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

-- CreateIndex
CREATE INDEX "StockMovement_tenantId_productId_createdAt_idx" ON "StockMovement"("tenantId", "productId", "createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_tenantId_warehouseId_createdAt_idx" ON "StockMovement"("tenantId", "warehouseId", "createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_tenantId_locationId_createdAt_idx" ON "StockMovement"("tenantId", "locationId", "createdAt");

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "WarehouseLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "WarehouseLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
