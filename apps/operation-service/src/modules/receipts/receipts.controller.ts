import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, Permissions, PermissionsGuard } from '@app/auth';
import { Request } from 'express';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { QueryReceiptsDto } from './dto/query-receipts.dto';
import { VoidReceiptDto } from './dto/void-receipt.dto';
import { ReceiptsService } from './receipts.service';

@ApiTags('receipts')
@ApiBearerAuth()
@ApiHeader({ name: 'x-branch-id', required: false })
@UseGuards(JwtAuthGuard)
@Controller('api/receipts')
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions('receipt.view')
  findAll(@Query() query: QueryReceiptsDto) {
    return this.receiptsService.findAll(query);
  }

  @Get('receipt-no/:receiptNo')
  @UseGuards(PermissionsGuard)
  @Permissions('receipt.view')
  findByReceiptNo(@Param('receiptNo') receiptNo: string) {
    return this.receiptsService.findByReceiptNo(receiptNo);
  }

  @Get('pos-order/:posOrderId')
  @UseGuards(PermissionsGuard)
  @Permissions('receipt.view')
  findByPosOrder(@Param('posOrderId', new ParseUUIDPipe()) posOrderId: string) {
    return this.receiptsService.findByPosOrder(posOrderId);
  }

  @Get('online-order/:onlineOrderId')
  @UseGuards(PermissionsGuard)
  @Permissions('receipt.view')
  findByOnlineOrder(
    @Param('onlineOrderId', new ParseUUIDPipe()) onlineOrderId: string,
  ) {
    return this.receiptsService.findByOnlineOrder(onlineOrderId);
  }

  @Get(':id/print-data')
  @UseGuards(PermissionsGuard)
  @Permissions('receipt.view')
  printData(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.receiptsService.printData(id);
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('receipt.view')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.receiptsService.findOne(id);
  }

  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions('receipt.create')
  create(@Req() req: Request, @Body() dto: CreateReceiptDto) {
    return this.receiptsService.create(req, dto);
  }

  @Post('from-pos-order/:posOrderId')
  @UseGuards(PermissionsGuard)
  @Permissions('receipt.create')
  createFromPosOrder(
    @Req() req: Request,
    @Param('posOrderId', new ParseUUIDPipe()) posOrderId: string,
  ) {
    return this.receiptsService.createFromPosOrder(req, posOrderId);
  }

  @Post('from-online-order/:onlineOrderId')
  @UseGuards(PermissionsGuard)
  @Permissions('receipt.create')
  createFromOnlineOrder(
    @Req() req: Request,
    @Param('onlineOrderId', new ParseUUIDPipe()) onlineOrderId: string,
    @Body() dto: CreateReceiptDto,
  ) {
    return this.receiptsService.createFromOnlineOrder(req, onlineOrderId, dto);
  }

  @Post(':id/reissue')
  @UseGuards(PermissionsGuard)
  @Permissions('receipt.reissue')
  reissue(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.receiptsService.reissue(id);
  }

  @Post(':id/void')
  @UseGuards(PermissionsGuard)
  @Permissions('receipt.void')
  voidReceipt(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: VoidReceiptDto,
  ) {
    return this.receiptsService.void(id, dto);
  }
}
