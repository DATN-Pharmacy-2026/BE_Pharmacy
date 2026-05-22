import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, Permissions, PermissionsGuard } from '@app/auth';
import { Request } from 'express';
import { CreateFefoAllocationDto } from './dto/create-fefo-allocation.dto';
import { FefoPreviewDto } from './dto/fefo-preview.dto';
import { QueryFefoAllocationsDto } from './dto/query-fefo-allocations.dto';
import { ReleaseFefoAllocationDto } from './dto/release-fefo-allocation.dto';
import { ReleaseFefoByOrderDto } from './dto/release-fefo-by-order.dto';
import { FefoService } from './fefo.service';

@ApiTags('fefo')
@ApiBearerAuth()
@ApiHeader({ name: 'x-branch-id', required: false })
@ApiHeader({ name: 'x-warehouse-id', required: false })
@UseGuards(JwtAuthGuard)
@Controller('api/fefo')
export class FefoController {
  constructor(private readonly fefoService: FefoService) {}

  @Get('allocations')
  @UseGuards(PermissionsGuard)
  @Permissions('inventory.view')
  findAllocations(@Query() query: QueryFefoAllocationsDto) {
    return this.fefoService.findAllocations(query);
  }

  @Get('allocations/order/:orderType/:orderId')
  @UseGuards(PermissionsGuard)
  @Permissions('inventory.view')
  findAllocationsByOrder(@Param('orderType') orderType: string, @Param('orderId', new ParseUUIDPipe()) orderId: string) {
    return this.fefoService.findAllocationsByOrder(orderType, orderId);
  }

  @Get('allocations/:id')
  @UseGuards(PermissionsGuard)
  @Permissions('inventory.view')
  findAllocation(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.fefoService.findAllocation(id);
  }

  @Post('preview')
  @UseGuards(PermissionsGuard)
  @Permissions('inventory.view')
  preview(@Req() req: Request, @Body() dto: FefoPreviewDto) {
    return this.fefoService.preview(req, dto);
  }

  @Post('allocate')
  @UseGuards(PermissionsGuard)
  @Permissions('inventory.adjust')
  allocate(@Req() req: Request, @Body() dto: CreateFefoAllocationDto) {
    return this.fefoService.allocate(req, dto);
  }

  @Post('allocations/:id/release')
  @UseGuards(PermissionsGuard)
  @Permissions('inventory.adjust')
  releaseAllocation(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: ReleaseFefoAllocationDto) {
    return this.fefoService.releaseAllocation(id, dto);
  }

  @Post('release-by-order')
  @UseGuards(PermissionsGuard)
  @Permissions('inventory.adjust')
  releaseByOrder(@Body() dto: ReleaseFefoByOrderDto) {
    return this.fefoService.releaseByOrder(dto);
  }
}
