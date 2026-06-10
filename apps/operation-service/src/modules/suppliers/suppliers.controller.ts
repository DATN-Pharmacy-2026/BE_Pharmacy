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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, Permissions, PermissionsGuard } from '@app/auth';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { QuerySuppliersDto } from './dto/query-suppliers.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SuppliersService } from './suppliers.service';

@ApiTags('suppliers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions('supplier.view')
  findAll(@Query() query: QuerySuppliersDto) {
    return this.suppliersService.findAll(query);
  }

  @Get('code/:code')
  @UseGuards(PermissionsGuard)
  @Permissions('supplier.view')
  findByCode(@Param('code') code: string) {
    return this.suppliersService.findByCode(code);
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('supplier.view')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.suppliersService.findOne(id);
  }

  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions('supplier.manage')
  create(@Body() dto: CreateSupplierDto) {
    return this.suppliersService.create(dto);
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('supplier.manage')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.suppliersService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('supplier.manage')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.suppliersService.remove(id);
  }
}
