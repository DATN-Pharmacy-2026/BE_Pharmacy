import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, Permissions, PermissionsGuard } from '@app/auth';
import { QueryPosPaymentsDto } from './dto/query-pos-payments.dto';
import { UpdatePosPaymentStatusDto } from './dto/update-pos-payment-status.dto';
import { PosPaymentsService } from './pos-payments.service';

@ApiTags('pos-payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/pos-payments')
export class PosPaymentsController {
  constructor(private readonly posPaymentsService: PosPaymentsService) {}

  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions('pos.access', 'pos_payment.view')
  findAll(@Query() query: QueryPosPaymentsDto) {
    return this.posPaymentsService.findAll(query);
  }

  @Get('order/:posOrderId')
  @UseGuards(PermissionsGuard)
  @Permissions('pos.access', 'pos_payment.view')
  findByOrder(@Param('posOrderId', new ParseUUIDPipe()) posOrderId: string) {
    return this.posPaymentsService.findByOrder(posOrderId);
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('pos.access', 'pos_payment.view')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.posPaymentsService.findOne(id);
  }

  @Patch(':id/status')
  @UseGuards(PermissionsGuard)
  @Permissions('pos.access', 'pos_payment.create|pos_payment.update')
  updateStatus(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdatePosPaymentStatusDto) {
    return this.posPaymentsService.updateStatus(id, dto);
  }
}
