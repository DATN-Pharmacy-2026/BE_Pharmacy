import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ShipmentStatus } from '.prisma/client/operation';
import { OperationPrismaService } from '../../prisma/operation-prisma.service';
import { QueryShipmentsDto } from './dto/query-shipments.dto';
import { UpdateShipmentStatusDto } from './dto/update-shipment-status.dto';

@Injectable()
export class ShipmentsService {
  constructor(private readonly prisma: OperationPrismaService) {}

  async findAll(query: QueryShipmentsDto) {
    const {
      page = 1,
      limit = 20,
      stockTransferId,
      shipmentNo,
      carrierName,
      trackingNo,
      status,
      shippedByUserId,
      receivedByUserId,
      dateFrom,
      dateTo,
    } = query;

    const where: Prisma.ShipmentWhereInput = {
      ...(stockTransferId ? { stockTransferId } : {}),
      ...(shipmentNo
        ? { shipmentNo: { contains: shipmentNo, mode: 'insensitive' } }
        : {}),
      ...(carrierName
        ? { carrierName: { contains: carrierName, mode: 'insensitive' } }
        : {}),
      ...(trackingNo
        ? { trackingNo: { contains: trackingNo, mode: 'insensitive' } }
        : {}),
      ...(status ? { status } : {}),
      ...(shippedByUserId ? { shippedByUserId } : {}),
      ...(receivedByUserId ? { receivedByUserId } : {}),
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo ? { lte: new Date(dateTo) } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.shipment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          stockTransfer: {
            select: { id: true, transferNo: true, status: true },
          },
        },
      }),
      this.prisma.shipment.count({ where }),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id },
      include: {
        stockTransfer: { select: { id: true, transferNo: true, status: true } },
      },
    });
    if (!shipment) throw new NotFoundException('Shipment not found');
    return shipment;
  }

  async findByStockTransferId(stockTransferId: string) {
    return this.prisma.shipment.findMany({
      where: { stockTransferId },
      orderBy: { createdAt: 'desc' },
      include: {
        stockTransfer: { select: { id: true, transferNo: true, status: true } },
      },
    });
  }

  async updateStatus(id: string, dto: UpdateShipmentStatusDto) {
    const shipment = await this.findOne(id);
    if (
      shipment.status === ShipmentStatus.CANCELLED &&
      dto.status !== ShipmentStatus.CANCELLED
    ) {
      throw new ConflictException('Cancelled shipment cannot transition');
    }

    return this.prisma.shipment.update({
      where: { id },
      data: {
        status: dto.status,
        deliveredAt: dto.deliveredAt
          ? new Date(dto.deliveredAt)
          : dto.status === ShipmentStatus.DELIVERED
            ? (shipment.deliveredAt ?? new Date())
            : shipment.deliveredAt,
      },
      include: {
        stockTransfer: { select: { id: true, transferNo: true, status: true } },
      },
    });
  }
}
