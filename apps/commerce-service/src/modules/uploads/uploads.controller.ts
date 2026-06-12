import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, Permissions, PermissionsGuard } from '@app/auth';
import { Response } from 'express';
import { UploadProductImageDto } from './dto/upload-product-image.dto';
import { UploadsService } from './uploads.service';

@ApiTags('uploads')
@Controller('api/uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('product-images')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('product.create|product.update')
  uploadProductImage(@Body() dto: UploadProductImageDto) {
    return this.uploadsService.uploadProductImage(dto);
  }

  @Get('product-images/:filename')
  async getProductImage(
    @Param('filename') filename: string,
    @Res() response: Response,
  ) {
    const filePath = await this.uploadsService.resolveProductImage(filename);
    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    response.sendFile(filePath);
  }
}
