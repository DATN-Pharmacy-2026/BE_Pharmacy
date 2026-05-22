/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InventoryMovementType } from '.prisma/client/operation';
import { InventoriesService } from './inventories.service';
import { InventoryAdjustmentType } from './dto/adjust-inventory.dto';

describe('InventoriesService', () => {
  const tenantId = 'tenant-1';
  const userId = 'user-1';

  const makeService = () => {
    const tx = {
      inventory: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
      },
      stockMovement: {
        create: jest.fn(),
      },
    } as any;

    const prisma = {
      inventory: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
      },
      warehouse: {
        findUnique: jest.fn(),
      },
      warehouseLocation: {
        findFirst: jest.fn(),
      },
      stockMovement: {
        create: jest.fn(),
      },
      $transaction: jest.fn(async (arg: any) => {
        if (typeof arg === 'function') return arg(tx);
        return Promise.all(arg);
      }),
    } as any;

    return { service: new InventoriesService(prisma), prisma, tx };
  };

  it('creates initial stock', async () => {
    const { service, prisma, tx } = makeService();
    prisma.warehouse.findUnique.mockResolvedValue({ id: 'w1' });
    prisma.inventory.findFirst.mockResolvedValue(null);
    tx.inventory.create.mockResolvedValue({ id: 'inv1', quantity: 100 });

    const result = await service.createInitialStock(tenantId, userId, {
      warehouseId: 'w1',
      productId: 'p1',
      quantity: 100,
      reason: 'Initial',
    });

    expect(result.id).toBe('inv1');
    expect(tx.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          movementType: InventoryMovementType.INITIAL_STOCK,
        }),
      }),
    );
  });

  it('rejects duplicate initial stock', async () => {
    const { service, prisma } = makeService();
    prisma.warehouse.findUnique.mockResolvedValue({ id: 'w1' });
    prisma.inventory.findFirst.mockResolvedValue({ id: 'existing' });

    await expect(
      service.createInitialStock(tenantId, userId, {
        warehouseId: 'w1',
        productId: 'p1',
        quantity: 100,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('queries inventory by warehouse', async () => {
    const { service, prisma } = makeService();
    prisma.inventory.findMany.mockResolvedValue([{ id: 'inv1' }]);
    prisma.inventory.count.mockResolvedValue(1);

    const result = await service.findByWarehouse(tenantId, 'w1', {
      page: 1,
      limit: 20,
    });

    expect(result.items).toHaveLength(1);
    expect(prisma.inventory.findMany).toHaveBeenCalled();
  });

  it('adjusts increase', async () => {
    const { service, prisma, tx } = makeService();
    prisma.warehouse.findUnique.mockResolvedValue({ id: 'w1' });
    tx.inventory.findFirst.mockResolvedValue({
      id: 'inv1',
      quantity: 10,
      reservedQuantity: 0,
    });
    tx.inventory.update.mockResolvedValue({ id: 'inv1', quantity: 15 });

    const result = await service.adjust(tenantId, userId, {
      warehouseId: 'w1',
      productId: 'p1',
      adjustmentType: InventoryAdjustmentType.INCREASE,
      quantity: 5,
    });

    expect(result.quantity).toBe(15);
    expect(tx.stockMovement.create).toHaveBeenCalled();
  });

  it('adjusts decrease', async () => {
    const { service, prisma, tx } = makeService();
    prisma.warehouse.findUnique.mockResolvedValue({ id: 'w1' });
    tx.inventory.findFirst.mockResolvedValue({
      id: 'inv1',
      quantity: 10,
      reservedQuantity: 0,
    });
    tx.inventory.update.mockResolvedValue({ id: 'inv1', quantity: 7 });

    const result = await service.adjust(tenantId, userId, {
      warehouseId: 'w1',
      productId: 'p1',
      adjustmentType: InventoryAdjustmentType.DECREASE,
      quantity: 3,
    });

    expect(result.quantity).toBe(7);
  });

  it('rejects decrease when insufficient', async () => {
    const { service, prisma, tx } = makeService();
    prisma.warehouse.findUnique.mockResolvedValue({ id: 'w1' });
    tx.inventory.findFirst.mockResolvedValue({
      id: 'inv1',
      quantity: 2,
      reservedQuantity: 0,
    });

    await expect(
      service.adjust(tenantId, userId, {
        warehouseId: 'w1',
        productId: 'p1',
        adjustmentType: InventoryAdjustmentType.DECREASE,
        quantity: 5,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('transfers stock between warehouses', async () => {
    const { service, prisma, tx } = makeService();
    prisma.warehouse.findUnique.mockResolvedValue({ id: 'w1' });

    tx.inventory.findFirst
      .mockResolvedValueOnce({
        id: 'source',
        quantity: 20,
        reservedQuantity: 0,
      })
      .mockResolvedValueOnce({ id: 'dest', quantity: 5, reservedQuantity: 0 });
    tx.inventory.update.mockResolvedValue({});

    const result = await service.transfer(tenantId, userId, {
      sourceWarehouseId: 'w1',
      destinationWarehouseId: 'w2',
      items: [{ productId: 'p1', quantity: 10 }],
      reason: 'move',
    });

    expect(result.success).toBe(true);
    expect(tx.stockMovement.create).toHaveBeenCalledTimes(2);
  });

  it('rejects transfer when source insufficient', async () => {
    const { service, prisma, tx } = makeService();
    prisma.warehouse.findUnique.mockResolvedValue({ id: 'w1' });
    tx.inventory.findFirst.mockResolvedValue({
      id: 'source',
      quantity: 2,
      reservedQuantity: 0,
    });

    await expect(
      service.transfer(tenantId, userId, {
        sourceWarehouseId: 'w1',
        destinationWarehouseId: 'w2',
        items: [{ productId: 'p1', quantity: 10 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rolls back transfer when one item fails', async () => {
    const { service, prisma, tx } = makeService();
    prisma.warehouse.findUnique.mockResolvedValue({ id: 'w1' });
    tx.inventory.findFirst
      .mockResolvedValueOnce({
        id: 'source1',
        quantity: 20,
        reservedQuantity: 0,
      })
      .mockResolvedValueOnce({ id: 'dest1', quantity: 0, reservedQuantity: 0 })
      .mockResolvedValueOnce({
        id: 'source2',
        quantity: 1,
        reservedQuantity: 0,
      });

    await expect(
      service.transfer(tenantId, userId, {
        sourceWarehouseId: 'w1',
        destinationWarehouseId: 'w2',
        items: [
          { productId: 'p1', quantity: 2 },
          { productId: 'p2', quantity: 10 },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws not found for unknown inventory id', async () => {
    const { service, prisma } = makeService();
    prisma.inventory.findFirst.mockResolvedValue(null);
    await expect(service.findOne(tenantId, 'inv-x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
