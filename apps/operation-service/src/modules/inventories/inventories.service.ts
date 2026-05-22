import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InventoryMovementType, Prisma } from '.prisma/client/operation';
import { OperationPrismaService } from '../../prisma/operation-prisma.service';
import {
  AdjustInventoryDto,
  InventoryAdjustmentType,
} from './dto/adjust-inventory.dto';
import { InitialStockDto } from './dto/initial-stock.dto';
import { QueryInventoriesDto } from './dto/query-inventories.dto';
import { TransferInventoryDto } from './dto/transfer-inventory.dto';

@Injectable()
export class InventoriesService {
  constructor(private readonly prisma: OperationPrismaService) {}

  async findAll(tenantId: string, query: QueryInventoriesDto) {
    const {
      page = 1,
      limit = 20,
      warehouseId,
      locationId,
      productId,
      search,
    } = query;
    const where: Prisma.InventoryWhereInput = {
      tenantId,
      ...(warehouseId ? { warehouseId } : {}),
      ...(locationId ? { locationId } : {}),
      ...(productId ? { productId } : {}),
      ...(search ? { productId: search } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.inventory.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.inventory.count({ where }),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(tenantId: string, id: string) {
    const inventory = await this.prisma.inventory.findFirst({
      where: { id, tenantId },
    });
    if (!inventory) throw new NotFoundException('Inventory not found');
    return inventory;
  }

  async findByWarehouse(
    tenantId: string,
    warehouseId: string,
    query: QueryInventoriesDto,
  ) {
    return this.findAll(tenantId, { ...query, warehouseId });
  }

  async findOneByWarehouseProduct(
    tenantId: string,
    warehouseId: string,
    productId: string,
  ) {
    const inventory = await this.prisma.inventory.findFirst({
      where: { tenantId, warehouseId, productId },
    });
    if (!inventory) throw new NotFoundException('Inventory not found');
    return inventory;
  }

  async createInitialStock(
    tenantId: string,
    userId: string,
    dto: InitialStockDto,
  ) {
    await this.ensureWarehouseExists(dto.warehouseId);
    if (dto.locationId)
      await this.ensureLocationExists(dto.locationId, dto.warehouseId);

    const existing = await this.prisma.inventory.findFirst({
      where: {
        tenantId,
        warehouseId: dto.warehouseId,
        locationId: dto.locationId ?? null,
        productId: dto.productId,
      },
    });

    if (existing) {
      throw new BadRequestException(
        'Initial stock already exists for warehouse/location and product',
      );
    }

    const available = dto.quantity;

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.inventory.create({
        data: {
          tenantId,
          warehouseId: dto.warehouseId,
          locationId: dto.locationId,
          productId: dto.productId,
          quantity: dto.quantity,
          reservedQuantity: 0,
          availableQuantity: available,
          minQuantity: dto.minQuantity,
          maxQuantity: dto.maxQuantity,
          isActive: true,
        },
      });

      await tx.stockMovement.create({
        data: {
          tenantId,
          productId: dto.productId,
          warehouseId: dto.warehouseId,
          locationId: dto.locationId,
          movementType: InventoryMovementType.INITIAL_STOCK,
          quantity: dto.quantity,
          beforeQuantity: 0,
          afterQuantity: dto.quantity,
          referenceType: 'INITIAL_STOCK',
          referenceId: created.id,
          reason: dto.reason,
          createdByUserId: userId,
        },
      });

      return created;
    });
  }

  async adjust(tenantId: string, userId: string, dto: AdjustInventoryDto) {
    await this.ensureWarehouseExists(dto.warehouseId);
    if (dto.locationId)
      await this.ensureLocationExists(dto.locationId, dto.warehouseId);

    return this.prisma.$transaction(async (tx) => {
      const inventory = await tx.inventory.findFirst({
        where: {
          tenantId,
          warehouseId: dto.warehouseId,
          locationId: dto.locationId ?? null,
          productId: dto.productId,
        },
      });

      if (!inventory) throw new NotFoundException('Inventory not found');

      const before = inventory.quantity;
      let after = before;
      if (dto.adjustmentType === InventoryAdjustmentType.INCREASE) {
        after = before + dto.quantity;
      } else {
        if (before < dto.quantity) {
          throw new BadRequestException('Insufficient stock for decrease');
        }
        after = before - dto.quantity;
      }

      if (after < inventory.reservedQuantity) {
        throw new BadRequestException(
          'Reserved quantity exceeds resulting stock',
        );
      }

      const updated = await tx.inventory.update({
        where: { id: inventory.id },
        data: {
          quantity: after,
          availableQuantity: after - inventory.reservedQuantity,
        },
      });

      await tx.stockMovement.create({
        data: {
          tenantId,
          productId: dto.productId,
          warehouseId: dto.warehouseId,
          locationId: dto.locationId,
          movementType:
            dto.adjustmentType === InventoryAdjustmentType.INCREASE
              ? InventoryMovementType.ADJUSTMENT_INCREASE
              : InventoryMovementType.ADJUSTMENT_DECREASE,
          quantity: dto.quantity,
          beforeQuantity: before,
          afterQuantity: after,
          referenceType: 'MANUAL_ADJUSTMENT',
          referenceId: inventory.id,
          reason: dto.reason,
          createdByUserId: userId,
        },
      });

      return updated;
    });
  }

  async transfer(tenantId: string, userId: string, dto: TransferInventoryDto) {
    if (dto.sourceWarehouseId === dto.destinationWarehouseId) {
      throw new BadRequestException(
        'Source and destination warehouse must be different',
      );
    }

    await this.ensureWarehouseExists(dto.sourceWarehouseId);
    await this.ensureWarehouseExists(dto.destinationWarehouseId);

    return this.prisma.$transaction(async (tx) => {
      for (const item of dto.items) {
        const source = await tx.inventory.findFirst({
          where: {
            tenantId,
            warehouseId: dto.sourceWarehouseId,
            locationId: null,
            productId: item.productId,
          },
        });

        if (!source || source.quantity < item.quantity) {
          throw new BadRequestException(
            'Insufficient stock in source warehouse',
          );
        }

        const sourceAfter = source.quantity - item.quantity;
        if (sourceAfter < source.reservedQuantity) {
          throw new BadRequestException(
            'Reserved quantity exceeds source stock after transfer',
          );
        }

        await tx.inventory.update({
          where: { id: source.id },
          data: {
            quantity: sourceAfter,
            availableQuantity: sourceAfter - source.reservedQuantity,
          },
        });

        await tx.stockMovement.create({
          data: {
            tenantId,
            productId: item.productId,
            warehouseId: dto.sourceWarehouseId,
            movementType: InventoryMovementType.TRANSFER_OUT,
            quantity: item.quantity,
            beforeQuantity: source.quantity,
            afterQuantity: sourceAfter,
            referenceType: 'INTERNAL_TRANSFER',
            referenceId: `${dto.sourceWarehouseId}:${dto.destinationWarehouseId}`,
            reason: dto.reason,
            createdByUserId: userId,
          },
        });

        let destination = await tx.inventory.findFirst({
          where: {
            tenantId,
            warehouseId: dto.destinationWarehouseId,
            locationId: null,
            productId: item.productId,
          },
        });

        if (!destination) {
          destination = await tx.inventory.create({
            data: {
              tenantId,
              warehouseId: dto.destinationWarehouseId,
              productId: item.productId,
              quantity: 0,
              reservedQuantity: 0,
              availableQuantity: 0,
              isActive: true,
            },
          });
        }

        const destinationAfter = destination.quantity + item.quantity;

        await tx.inventory.update({
          where: { id: destination.id },
          data: {
            quantity: destinationAfter,
            availableQuantity: destinationAfter - destination.reservedQuantity,
          },
        });

        await tx.stockMovement.create({
          data: {
            tenantId,
            productId: item.productId,
            warehouseId: dto.destinationWarehouseId,
            movementType: InventoryMovementType.TRANSFER_IN,
            quantity: item.quantity,
            beforeQuantity: destination.quantity,
            afterQuantity: destinationAfter,
            referenceType: 'INTERNAL_TRANSFER',
            referenceId: `${dto.sourceWarehouseId}:${dto.destinationWarehouseId}`,
            reason: dto.reason,
            createdByUserId: userId,
          },
        });
      }

      return { success: true };
    });
  }

  private async ensureWarehouseExists(warehouseId: string) {
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id: warehouseId },
    });
    if (!warehouse) throw new NotFoundException('Warehouse not found');
  }

  private async ensureLocationExists(locationId: string, warehouseId: string) {
    const location = await this.prisma.warehouseLocation.findFirst({
      where: { id: locationId, warehouseId },
    });
    if (!location) throw new NotFoundException('Warehouse location not found');
  }
}
