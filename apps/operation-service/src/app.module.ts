import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { configuration, validateEnv } from '@app/config';
import {
  createCorrelationIdMiddleware,
  createRequestLoggingMiddleware,
  LoggerModule,
} from '@app/logger';
import { HealthController } from './health/health.controller';
import { BranchesModule } from './modules/branches/branches.module';
import { BatchesModule } from './modules/batches/batches.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { GoodsReceiptsModule } from './modules/goods-receipts/goods-receipts.module';
import { FefoModule } from './modules/fefo/fefo.module';
import { PosTerminalsModule } from './modules/pos-terminals/pos-terminals.module';
import { PosOrdersModule } from './modules/pos-orders/pos-orders.module';
import { PosPaymentsModule } from './modules/pos-payments/pos-payments.module';
import { PosSessionsModule } from './modules/pos-sessions/pos-sessions.module';
import { PurchaseOrdersModule } from './modules/purchase-orders/purchase-orders.module';
import { ReceiptsModule } from './modules/receipts/receipts.module';
import { ShipmentsModule } from './modules/shipments/shipments.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { StockTransfersModule } from './modules/stock-transfers/stock-transfers.module';
import { StockMovementsModule } from './modules/stock-movements/stock-movements.module';
import { StockAdjustmentsModule } from './modules/stock-adjustments/stock-adjustments.module';
import { StoresModule } from './modules/stores/stores.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { VerificationModule } from './modules/verification/verification.module';
import { WarehousesModule } from './modules/warehouses/warehouses.module';
import { OperationPrismaModule } from './prisma/operation-prisma.module';
import { JwtStrategy } from './auth/jwt.strategy';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    LoggerModule,
    OperationPrismaModule,
    CompaniesModule,
    BranchesModule,
    BatchesModule,
    StoresModule,
    WarehousesModule,
    InventoryModule,
    StockMovementsModule,
    StockAdjustmentsModule,
    SuppliersModule,
    PurchaseOrdersModule,
    GoodsReceiptsModule,
    FefoModule,
    StockTransfersModule,
    ShipmentsModule,
    PosTerminalsModule,
    PosSessionsModule,
    PosOrdersModule,
    PosPaymentsModule,
    ReceiptsModule,
    VerificationModule,
  ],
  providers: [
    JwtStrategy,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(
        createCorrelationIdMiddleware(),
        createRequestLoggingMiddleware('operation-service'),
      )
      .forRoutes('*');
  }
}
