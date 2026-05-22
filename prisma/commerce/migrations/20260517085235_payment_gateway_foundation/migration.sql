-- CreateEnum
CREATE TYPE "PaymentGatewayProvider" AS ENUM ('VNPAY', 'MOMO', 'ZALOPAY');

-- CreateEnum
CREATE TYPE "PaymentGatewayTransactionStatus" AS ENUM ('INITIATED', 'PENDING', 'PAID', 'FAILED', 'CANCELED', 'EXPIRED', 'REFUNDED', 'UNKNOWN');

-- CreateTable
CREATE TABLE "PaymentGatewayTransaction" (
    "id" UUID NOT NULL,
    "paymentId" UUID,
    "orderId" UUID,
    "provider" "PaymentGatewayProvider" NOT NULL,
    "providerOrderId" TEXT NOT NULL,
    "providerTransactionId" TEXT,
    "requestId" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "status" "PaymentGatewayTransactionStatus" NOT NULL DEFAULT 'INITIATED',
    "paymentUrl" TEXT,
    "qrCodeUrl" TEXT,
    "deeplink" TEXT,
    "appLink" TEXT,
    "returnUrl" TEXT,
    "ipnUrl" TEXT,
    "rawRequest" JSONB,
    "rawResponse" JSONB,
    "verifiedPayload" JSONB,
    "lastCallbackAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),
    "syncedAt" TIMESTAMP(3),
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "branchId" UUID,
    "warehouseId" UUID,
    "customerUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentGatewayTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentGatewayCallbackLog" (
    "id" UUID NOT NULL,
    "transactionId" UUID,
    "provider" "PaymentGatewayProvider" NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "headers" JSONB,
    "signatureValid" BOOLEAN NOT NULL DEFAULT false,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processingResult" JSONB,
    "errorMessage" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentGatewayCallbackLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentGatewayTransaction_paymentId_idx" ON "PaymentGatewayTransaction"("paymentId");

-- CreateIndex
CREATE INDEX "PaymentGatewayTransaction_orderId_idx" ON "PaymentGatewayTransaction"("orderId");

-- CreateIndex
CREATE INDEX "PaymentGatewayTransaction_provider_idx" ON "PaymentGatewayTransaction"("provider");

-- CreateIndex
CREATE INDEX "PaymentGatewayTransaction_providerOrderId_idx" ON "PaymentGatewayTransaction"("providerOrderId");

-- CreateIndex
CREATE INDEX "PaymentGatewayTransaction_providerTransactionId_idx" ON "PaymentGatewayTransaction"("providerTransactionId");

-- CreateIndex
CREATE INDEX "PaymentGatewayTransaction_requestId_idx" ON "PaymentGatewayTransaction"("requestId");

-- CreateIndex
CREATE INDEX "PaymentGatewayTransaction_status_idx" ON "PaymentGatewayTransaction"("status");

-- CreateIndex
CREATE INDEX "PaymentGatewayTransaction_branchId_idx" ON "PaymentGatewayTransaction"("branchId");

-- CreateIndex
CREATE INDEX "PaymentGatewayTransaction_warehouseId_idx" ON "PaymentGatewayTransaction"("warehouseId");

-- CreateIndex
CREATE INDEX "PaymentGatewayTransaction_customerUserId_idx" ON "PaymentGatewayTransaction"("customerUserId");

-- CreateIndex
CREATE INDEX "PaymentGatewayTransaction_createdAt_idx" ON "PaymentGatewayTransaction"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentGatewayTransaction_provider_providerOrderId_key" ON "PaymentGatewayTransaction"("provider", "providerOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentGatewayTransaction_provider_requestId_key" ON "PaymentGatewayTransaction"("provider", "requestId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentGatewayTransaction_idempotencyKey_key" ON "PaymentGatewayTransaction"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PaymentGatewayCallbackLog_transactionId_idx" ON "PaymentGatewayCallbackLog"("transactionId");

-- CreateIndex
CREATE INDEX "PaymentGatewayCallbackLog_provider_idx" ON "PaymentGatewayCallbackLog"("provider");

-- CreateIndex
CREATE INDEX "PaymentGatewayCallbackLog_type_idx" ON "PaymentGatewayCallbackLog"("type");

-- CreateIndex
CREATE INDEX "PaymentGatewayCallbackLog_signatureValid_idx" ON "PaymentGatewayCallbackLog"("signatureValid");

-- CreateIndex
CREATE INDEX "PaymentGatewayCallbackLog_processed_idx" ON "PaymentGatewayCallbackLog"("processed");

-- CreateIndex
CREATE INDEX "PaymentGatewayCallbackLog_receivedAt_idx" ON "PaymentGatewayCallbackLog"("receivedAt");

-- AddForeignKey
ALTER TABLE "PaymentGatewayTransaction" ADD CONSTRAINT "PaymentGatewayTransaction_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentGatewayTransaction" ADD CONSTRAINT "PaymentGatewayTransaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "OnlineOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentGatewayCallbackLog" ADD CONSTRAINT "PaymentGatewayCallbackLog_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "PaymentGatewayTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
