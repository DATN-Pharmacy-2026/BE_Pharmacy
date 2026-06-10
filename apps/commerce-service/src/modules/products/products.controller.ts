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
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, Permissions, PermissionsGuard } from '@app/auth';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';
import { ProductsService } from './products.service';

@ApiTags('products')
@Controller('api/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@Query() query: QueryProductsDto) {
    return this.productsService.findAll(query);
  }

  @Get('sku/:sku')
  findBySku(@Param('sku') sku: string) {
    return this.productsService.findBySku(sku);
  }

  @Get('barcode/:barcode')
  findByBarcode(@Param('barcode') barcode: string) {
    return this.productsService.findByBarcode(barcode);
  }

  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.productsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('product.create')
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('product.update')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('product.delete')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.productsService.remove(id);
  }

  @Post(':productId/images')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('product.update')
  addImage(
    @Param('productId', new ParseUUIDPipe()) productId: string,
    @Body() dto: CreateProductImageDto,
  ) {
    return this.productsService.addImage(productId, dto);
  }

  @Delete(':productId/images/:imageId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('product.update')
  removeImage(
    @Param('productId', new ParseUUIDPipe()) productId: string,
    @Param('imageId', new ParseUUIDPipe()) imageId: string,
  ) {
    return this.productsService.removeImage(productId, imageId);
  }

  @Post(':productId/variants')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('product.update')
  addVariant(
    @Param('productId', new ParseUUIDPipe()) productId: string,
    @Body() dto: CreateProductVariantDto,
  ) {
    return this.productsService.addVariant(productId, dto);
  }

  @Patch(':productId/variants/:variantId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('product.update')
  updateVariant(
    @Param('productId', new ParseUUIDPipe()) productId: string,
    @Param('variantId', new ParseUUIDPipe()) variantId: string,
    @Body() dto: UpdateProductVariantDto,
  ) {
    return this.productsService.updateVariant(productId, variantId, dto);
  }

  @Delete(':productId/variants/:variantId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('product.update')
  removeVariant(
    @Param('productId', new ParseUUIDPipe()) productId: string,
    @Param('variantId', new ParseUUIDPipe()) variantId: string,
  ) {
    return this.productsService.removeVariant(productId, variantId);
  }
}
