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
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, Permissions, PermissionsGuard } from '@app/auth';
import { Request } from 'express';
import { CreateGoodsReceiptDto } from './dto/create-goods-receipt.dto';
import { QueryGoodsReceiptsDto } from './dto/query-goods-receipts.dto';
import { UpdateGoodsReceiptStatusDto } from './dto/update-goods-receipt-status.dto';
import { UpdateGoodsReceiptDto } from './dto/update-goods-receipt.dto';
import { GoodsReceiptsService } from './goods-receipts.service';

@ApiTags('goods-receipts')
@ApiBearerAuth()
@ApiHeader({ name: 'x-branch-id', required: false })
@ApiHeader({ name: 'x-warehouse-id', required: false })
@UseGuards(JwtAuthGuard)
@Controller('api/goods-receipts')
export class GoodsReceiptsController {
  constructor(private readonly goodsReceiptsService: GoodsReceiptsService) {}

  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions('goods_receipt.view')
  findAll(@Query() query: QueryGoodsReceiptsDto) {
    return this.goodsReceiptsService.findAll(query);
  }

  @Get('receipt-no/:receiptNo')
  @UseGuards(PermissionsGuard)
  @Permissions('goods_receipt.view')
  findByReceiptNo(@Param('receiptNo') receiptNo: string) {
    return this.goodsReceiptsService.findByReceiptNo(receiptNo);
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('goods_receipt.view')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.goodsReceiptsService.findOne(id);
  }

  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions('goods_receipt.create')
  create(@Req() req: Request, @Body() dto: CreateGoodsReceiptDto) {
    return this.goodsReceiptsService.create(req, dto);
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('goods_receipt.update')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateGoodsReceiptDto,
  ) {
    return this.goodsReceiptsService.update(id, dto);
  }

  @Patch(':id/status')
  @UseGuards(PermissionsGuard)
  @Permissions('goods_receipt.receive')
  updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateGoodsReceiptStatusDto,
  ) {
    return this.goodsReceiptsService.updateStatus(id, dto);
  }

  @Post(':id/post-inventory')
  @UseGuards(PermissionsGuard)
  @Permissions('goods_receipt.receive')
  postInventory(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: Request,
  ) {
    return this.goodsReceiptsService.postInventory(id, req);
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('goods_receipt.cancel')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.goodsReceiptsService.remove(id);
  }
}
