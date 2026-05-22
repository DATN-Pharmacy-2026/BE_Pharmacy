import { PartialType } from '@nestjs/swagger';
import { AssignUserWarehouseAccessDto } from './assign-user-warehouse-access.dto';

export class UpdateUserWarehouseAccessDto extends PartialType(
  AssignUserWarehouseAccessDto,
) {}
