import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import {
  PublicCartAvailabilityDto,
  PublicProductAvailabilityQueryDto,
} from './dto/public-inventory.dto';

@ApiTags('public-inventory')
@Controller('api/public-inventory')
export class PublicInventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('availability')
  availability(@Query() query: PublicProductAvailabilityQueryDto) {
    return this.inventoryService.getPublicAvailability(query);
  }

  @Post('verify-cart')
  verifyCart(@Body() dto: PublicCartAvailabilityDto) {
    return this.inventoryService.verifyPublicCart(dto);
  }
}
