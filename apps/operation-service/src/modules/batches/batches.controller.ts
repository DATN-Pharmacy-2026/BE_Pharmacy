import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, Permissions, PermissionsGuard } from '@app/auth';
import { BatchesService } from './batches.service';
import { CreateBatchDto } from './dto/create-batch.dto';
import { QueryBatchesDto } from './dto/query-batches.dto';
import { UpdateBatchDto } from './dto/update-batch.dto';

@ApiTags('batches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/batches')
export class BatchesController {
  constructor(private readonly batchesService: BatchesService) {}

  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions('batch.view')
  findAll(@Query() query: QueryBatchesDto) {
    return this.batchesService.findAll(query);
  }

  @Get('product/:productId')
  @UseGuards(PermissionsGuard)
  @Permissions('batch.view')
  findByProduct(@Param('productId', new ParseUUIDPipe()) productId: string, @Query() query: QueryBatchesDto) {
    return this.batchesService.findByProduct(productId, query);
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('batch.view')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.batchesService.findOne(id);
  }

  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions('batch.manage')
  create(@Body() dto: CreateBatchDto) {
    return this.batchesService.create(dto);
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('batch.manage')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateBatchDto) {
    return this.batchesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('batch.manage')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.batchesService.remove(id);
  }
}
