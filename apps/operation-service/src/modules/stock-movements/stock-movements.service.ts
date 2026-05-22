import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '.prisma/client/operation';
import { OperationPrismaService } from '../../prisma/operation-prisma.service';
import { QueryStockMovementsDto } from './dto/query-stock-movements.dto';

@Injectable()
export class StockMovementsService {
  constructor(private readonly prisma: OperationPrismaService) {}

  async findAll(query: QueryStockMovementsDto) {
    const { page = 1, limit = 20, productId, batchId, warehouseId, branchId, movementType, referenceType, referenceId, createdByUserId, dateFrom, dateTo } = query;
    const where: Prisma.StockMovementWhereInput = {
      ...(productId ? { productId } : {}),
      ...(batchId ? { batchId } : {}),
      ...(warehouseId ? { warehouseId } : {}),
      ...(branchId ? { branchId } : {}),
      ...(movementType ? { movementType } : {}),
      ...(referenceType ? { referenceType: { contains: referenceType, mode: 'insensitive' } } : {}),
      ...(referenceId ? { referenceId: { contains: referenceId, mode: 'insensitive' } } : {}),
      ...(createdByUserId ? { createdByUserId } : {}),
      ...((dateFrom || dateTo)
        ? {
            createdAt: {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo ? { lte: new Date(dateTo) } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.stockMovement.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const movement = await this.prisma.stockMovement.findUnique({ where: { id } });
    if (!movement) throw new NotFoundException('Stock movement not found');
    return movement;
  }
}
