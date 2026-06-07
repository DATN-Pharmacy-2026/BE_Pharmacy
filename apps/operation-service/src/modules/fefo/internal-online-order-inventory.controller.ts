import { Body, Controller, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FefoService } from './fefo.service';
import {
  InternalOnlineOrderActionDto,
  InternalReserveOnlineOrderDto,
} from './dto/internal-online-order-inventory.dto';

@Controller('api/internal-inventory/online-orders')
export class InternalOnlineOrderInventoryController {
  constructor(
    private readonly fefoService: FefoService,
    private readonly configService: ConfigService,
  ) {}

  @Post('reserve')
  reserve(
    @Headers('x-internal-service-key') serviceKey: string | undefined,
    @Body() dto: InternalReserveOnlineOrderDto,
  ) {
    this.assertServiceKey(serviceKey);
    return this.fefoService.reserveOnlineOrder(dto);
  }

  @Post('release')
  release(
    @Headers('x-internal-service-key') serviceKey: string | undefined,
    @Body() dto: InternalOnlineOrderActionDto,
  ) {
    this.assertServiceKey(serviceKey);
    return this.fefoService.releaseOnlineOrder(dto.orderId);
  }

  @Post('consume')
  consume(
    @Headers('x-internal-service-key') serviceKey: string | undefined,
    @Body() dto: InternalOnlineOrderActionDto,
  ) {
    this.assertServiceKey(serviceKey);
    return this.fefoService.consumeOnlineOrder(dto.orderId);
  }

  private assertServiceKey(serviceKey: string | undefined) {
    const expected = this.configService.get<string>('internal.serviceKey');
    if (!expected || serviceKey !== expected) {
      throw new UnauthorizedException('Invalid internal service key');
    }
  }
}
