import { Body, Controller, Get, Headers, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, Permissions, PermissionsGuard } from '@app/auth';
import { Request } from 'express';
import { PaymentGatewayProvider } from '.prisma/client/commerce';
import { InitiatePaymentGatewayDto } from './dto/initiate-payment-gateway.dto';
import { PaymentGatewayIpnDto } from './dto/payment-gateway-ipn.dto';
import { PaymentGatewayReturnDto } from './dto/payment-gateway-return.dto';
import { QueryPaymentGatewayTransactionsDto } from './dto/query-payment-gateway-transactions.dto';
import { SyncPaymentGatewayTransactionDto } from './dto/sync-payment-gateway-transaction.dto';
import { PaymentGatewaysService } from './payment-gateways.service';

@ApiTags('payment-gateways')
@Controller('api/payment-gateways')
export class PaymentGatewaysController {
  constructor(private readonly service: PaymentGatewaysService) {}

  @Get('providers')
  getProviders() {
    return this.service.getProviders();
  }

  @Get('transactions')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('payment.view')
  findTransactions(@Query() query: QueryPaymentGatewayTransactionsDto) {
    return this.service.findTransactions(query);
  }

  @Get('transactions/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('payment.view')
  findTransactionById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.findTransactionById(id);
  }

  @Post('initiate')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('customer.payment.create')
  initiate(
    @Body() dto: InitiatePaymentGatewayDto,
    @Headers('x-branch-id') branchId?: string,
    @Headers('x-warehouse-id') warehouseId?: string,
  ) {
    return this.service.initiate(dto, { branchId, warehouseId });
  }

  @Post('transactions/:id/sync')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('payment.update')
  sync(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: SyncPaymentGatewayTransactionDto,
  ) {
    return this.service.syncTransaction(id, dto);
  }

  @Get('vnpay/return')
  vnpayReturn(@Query() payload: PaymentGatewayReturnDto & Record<string, any>) {
    return this.service.handleProviderReturn(PaymentGatewayProvider.VNPAY, payload);
  }

  @Get('vnpay/ipn')
  vnpayIpn(@Query() payload: PaymentGatewayIpnDto & Record<string, any>) {
    return this.service.handleProviderIpn(PaymentGatewayProvider.VNPAY, payload);
  }

  @Get('momo/return')
  momoReturn(@Query() payload: PaymentGatewayReturnDto & Record<string, any>) {
    return this.service.handleProviderReturn(PaymentGatewayProvider.MOMO, payload);
  }

  @Post('momo/ipn')
  momoIpn(@Body() payload: PaymentGatewayIpnDto & Record<string, any>, @Req() req: Request) {
    return this.service.handleProviderIpn(PaymentGatewayProvider.MOMO, payload, req.headers as Record<string, any>);
  }

  @Get('zalopay/return')
  zalopayReturn(@Query() payload: PaymentGatewayReturnDto & Record<string, any>) {
    return this.service.handleProviderReturn(PaymentGatewayProvider.ZALOPAY, payload);
  }

  @Post('zalopay/callback')
  zalopayCallback(@Body() payload: PaymentGatewayIpnDto & Record<string, any>, @Req() req: Request) {
    return this.service.handleProviderIpn(PaymentGatewayProvider.ZALOPAY, payload, req.headers as Record<string, any>);
  }
}
