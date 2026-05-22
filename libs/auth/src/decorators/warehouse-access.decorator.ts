import { SetMetadata } from '@nestjs/common';

export const WAREHOUSE_ACCESS_KEY = 'warehouse_access_required';
export const WarehouseAccess = () => SetMetadata(WAREHOUSE_ACCESS_KEY, true);
