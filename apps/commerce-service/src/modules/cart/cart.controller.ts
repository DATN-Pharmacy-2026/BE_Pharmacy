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
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { OptionalJwtAuthGuard } from '../../auth/optional-jwt-auth.guard';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { QueryCartDto } from './dto/query-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@ApiTags('carts')
@ApiHeader({ name: 'x-branch-id', required: false })
@ApiHeader({ name: 'x-session-id', required: false })
@UseGuards(OptionalJwtAuthGuard)
@Controller('api/carts')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get('current')
  getCurrent(@Req() req: Request, @Query() query: QueryCartDto) {
    return this.cartService.getCurrentCart(req, query);
  }

  @Get(':id')
  getById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.cartService.getById(id);
  }

  @Post('items')
  addItem(
    @Req() req: Request,
    @Query() query: QueryCartDto,
    @Body() dto: AddCartItemDto,
  ) {
    return this.cartService.addItem(req, query, dto);
  }

  @Patch('items/:itemId')
  updateItem(
    @Req() req: Request,
    @Query() query: QueryCartDto,
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(req, query, itemId, dto);
  }

  @Delete('items/:itemId')
  removeItem(
    @Req() req: Request,
    @Query() query: QueryCartDto,
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
  ) {
    return this.cartService.removeItem(req, query, itemId);
  }

  @Delete('current')
  clearCurrent(@Req() req: Request, @Query() query: QueryCartDto) {
    return this.cartService.clearCurrentCart(req, query);
  }
}
