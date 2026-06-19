import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, Permissions, PermissionsGuard } from '@app/auth';
import { Request } from 'express';
import { QueryPaymentsDto } from './dto/query-payments.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('api/payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @Permissions('payment.view')
  findAll(@Query() query: QueryPaymentsDto, @Req() req: Request) {
    return this.paymentsService.findAll(query, req);
  }

  @Get('order/:onlineOrderId')
  @Permissions('payment.view|customer.payment.view_self')
  findByOrder(
    @Param('onlineOrderId', new ParseUUIDPipe()) onlineOrderId: string,
    @Req() req: Request,
  ) {
    return this.paymentsService.findByOrder(onlineOrderId, req);
  }

  @Get(':id')
  @Permissions('payment.view|customer.payment.view_self')
  findOne(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: Request) {
    return this.paymentsService.findOne(id, req);
  }

  @Patch(':id/status')
  @Permissions('payment.update')
  updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdatePaymentStatusDto,
  ) {
    return this.paymentsService.updateStatus(id, dto);
  }
}
