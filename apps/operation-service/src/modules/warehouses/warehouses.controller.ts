import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateWarehouseLocationDto } from './dto/create-warehouse-location.dto';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { QueryWarehousesDto } from './dto/query-warehouses.dto';
import { UpdateWarehouseLocationDto } from './dto/update-warehouse-location.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { WarehousesService } from './warehouses.service';

@ApiTags('warehouses')
@Controller('api/warehouses')
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @Get()
  findAll(@Query() query: QueryWarehousesDto) {
    return this.warehousesService.findAll(query);
  }

  @Get('code/:code')
  findByCode(@Param('code') code: string) {
    return this.warehousesService.findByCode(code);
  }

  @Get('locations/:locationId')
  findLocation(@Param('locationId', new ParseUUIDPipe()) locationId: string) {
    return this.warehousesService.findLocation(locationId);
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.warehousesService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateWarehouseDto) {
    return this.warehousesService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateWarehouseDto,
  ) {
    return this.warehousesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.warehousesService.remove(id);
  }

  @Get(':warehouseId/locations')
  listLocations(
    @Param('warehouseId', new ParseUUIDPipe()) warehouseId: string,
  ) {
    return this.warehousesService.listLocations(warehouseId);
  }

  @Post(':warehouseId/locations')
  createLocation(
    @Param('warehouseId', new ParseUUIDPipe()) warehouseId: string,
    @Body() dto: CreateWarehouseLocationDto,
  ) {
    return this.warehousesService.createLocation(warehouseId, dto);
  }

  @Patch('locations/:locationId')
  updateLocation(
    @Param('locationId', new ParseUUIDPipe()) locationId: string,
    @Body() dto: UpdateWarehouseLocationDto,
  ) {
    return this.warehousesService.updateLocation(locationId, dto);
  }

  @Delete('locations/:locationId')
  removeLocation(@Param('locationId', new ParseUUIDPipe()) locationId: string) {
    return this.warehousesService.removeLocation(locationId);
  }
}
