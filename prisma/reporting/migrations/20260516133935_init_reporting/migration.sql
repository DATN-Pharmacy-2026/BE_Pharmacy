-- CreateEnum
CREATE TYPE "SettingScope" AS ENUM ('SYSTEM', 'BRANCH', 'WAREHOUSE');

-- CreateEnum
CREATE TYPE "ReportJobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "Setting" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "scope" "SettingScope" NOT NULL,
    "branchId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "actorUserId" UUID,
    "branchId" UUID,
    "warehouseId" UUID,
    "serviceName" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" UUID,
    "beforeData" JSONB,
    "afterData" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportJob" (
    "id" UUID NOT NULL,
    "reportType" TEXT NOT NULL,
    "requestedByUserId" UUID NOT NULL,
    "branchId" UUID,
    "warehouseId" UUID,
    "status" "ReportJobStatus" NOT NULL,
    "filters" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ReportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportExport" (
    "id" UUID NOT NULL,
    "reportJobId" UUID NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportExport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DashboardSnapshot" (
    "id" UUID NOT NULL,
    "branchId" UUID,
    "warehouseId" UUID,
    "snapshotDate" DATE NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DashboardSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KPISnapshot" (
    "id" UUID NOT NULL,
    "branchId" UUID,
    "warehouseId" UUID,
    "metricCode" TEXT NOT NULL,
    "metricValue" DECIMAL(18,2) NOT NULL,
    "snapshotDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KPISnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Setting_branchId_idx" ON "Setting"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "Setting_key_scope_branchId_key" ON "Setting"("key", "scope", "branchId");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_branchId_idx" ON "AuditLog"("branchId");

-- CreateIndex
CREATE INDEX "AuditLog_warehouseId_idx" ON "AuditLog"("warehouseId");

-- CreateIndex
CREATE INDEX "AuditLog_serviceName_module_action_idx" ON "AuditLog"("serviceName", "module", "action");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "ReportJob_requestedByUserId_createdAt_idx" ON "ReportJob"("requestedByUserId", "createdAt");

-- CreateIndex
CREATE INDEX "ReportJob_branchId_idx" ON "ReportJob"("branchId");

-- CreateIndex
CREATE INDEX "ReportJob_warehouseId_idx" ON "ReportJob"("warehouseId");

-- CreateIndex
CREATE INDEX "DashboardSnapshot_branchId_snapshotDate_idx" ON "DashboardSnapshot"("branchId", "snapshotDate");

-- CreateIndex
CREATE INDEX "KPISnapshot_branchId_metricCode_snapshotDate_idx" ON "KPISnapshot"("branchId", "metricCode", "snapshotDate");

-- AddForeignKey
ALTER TABLE "ReportExport" ADD CONSTRAINT "ReportExport_reportJobId_fkey" FOREIGN KEY ("reportJobId") REFERENCES "ReportJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
