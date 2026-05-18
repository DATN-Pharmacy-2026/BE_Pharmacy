import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  BranchAccess,
  BranchAccessGuard,
  JwtAuthGuard,
  Permissions,
  PermissionsGuard,
  WarehouseAccess,
  WarehouseAccessGuard,
} from '@app/auth';
import { AccessService } from './access.service';
import { AssignUserBranchAccessDto } from './dto/assign-user-branch-access.dto';
import { AssignUserWarehouseAccessDto } from './dto/assign-user-warehouse-access.dto';
import { UpdateUserBranchAccessDto } from './dto/update-user-branch-access.dto';
import { UpdateUserWarehouseAccessDto } from './dto/update-user-warehouse-access.dto';

@ApiTags('access')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('access')
export class AccessController {
  constructor(private readonly accessService: AccessService) {}

  @Post('users/:userId/branches')
  @UseGuards(PermissionsGuard)
  @Permissions('user.update')
  upsertBranch(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body() dto: AssignUserBranchAccessDto,
  ) {
    return this.accessService.upsertUserBranchAccess(userId, dto);
  }

  @Get('users/:userId/branches')
  listBranches(@Param('userId', new ParseUUIDPipe()) userId: string) {
    return this.accessService.listUserBranchAccess(userId);
  }

  @Patch('users/:userId/branches/:branchId')
  @UseGuards(PermissionsGuard, BranchAccessGuard)
  @Permissions('user.update')
  @BranchAccess()
  updateBranch(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Param('branchId', new ParseUUIDPipe()) branchId: string,
    @Body() dto: UpdateUserBranchAccessDto,
  ) {
    return this.accessService.updateUserBranchAccess(userId, branchId, dto);
  }

  @Delete('users/:userId/branches/:branchId')
  @UseGuards(PermissionsGuard, BranchAccessGuard)
  @Permissions('user.update')
  @BranchAccess()
  deleteBranch(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Param('branchId', new ParseUUIDPipe()) branchId: string,
  ) {
    return this.accessService.deleteUserBranchAccess(userId, branchId);
  }

  @Post('users/:userId/warehouses')
  @UseGuards(PermissionsGuard)
  @Permissions('user.update')
  upsertWarehouse(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body() dto: AssignUserWarehouseAccessDto,
  ) {
    return this.accessService.upsertUserWarehouseAccess(userId, dto);
  }

  @Get('users/:userId/warehouses')
  listWarehouses(@Param('userId', new ParseUUIDPipe()) userId: string) {
    return this.accessService.listUserWarehouseAccess(userId);
  }

  @Patch('users/:userId/warehouses/:warehouseId')
  @UseGuards(PermissionsGuard, WarehouseAccessGuard)
  @Permissions('user.update')
  @WarehouseAccess()
  updateWarehouse(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Param('warehouseId', new ParseUUIDPipe()) warehouseId: string,
    @Body() dto: UpdateUserWarehouseAccessDto,
  ) {
    return this.accessService.updateUserWarehouseAccess(
      userId,
      warehouseId,
      dto,
    );
  }

  @Delete('users/:userId/warehouses/:warehouseId')
  @UseGuards(PermissionsGuard, WarehouseAccessGuard)
  @Permissions('user.update')
  @WarehouseAccess()
  deleteWarehouse(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Param('warehouseId', new ParseUUIDPipe()) warehouseId: string,
  ) {
    return this.accessService.deleteUserWarehouseAccess(userId, warehouseId);
  }
}
