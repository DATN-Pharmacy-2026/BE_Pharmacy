import { Body, Controller, Post, Req } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CheckoutDto } from './dto/checkout.dto';
import { CheckoutService } from './checkout.service';

@ApiTags('checkout')
@ApiHeader({ name: 'x-branch-id', required: false })
@ApiHeader({ name: 'x-warehouse-id', required: false })
@ApiHeader({ name: 'x-session-id', required: false })
@Controller('api/checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post()
  checkout(@Req() req: Request, @Body() dto: CheckoutDto) {
    return this.checkoutService.checkout(req, dto);
  }
}
