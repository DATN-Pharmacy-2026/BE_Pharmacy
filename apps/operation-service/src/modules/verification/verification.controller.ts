import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, Permissions, PermissionsGuard } from '@app/auth';
import { Request } from 'express';
import { QueryBarcodeVerificationsDto } from './dto/query-barcode-verifications.dto';
import { VerifyBarcodeDto } from './dto/verify-barcode.dto';
import { VerifyPosSaleDto } from './dto/verify-pos-sale.dto';
import { VerifyProductAvailabilityDto } from './dto/verify-product-availability.dto';
import { VerificationService } from './verification.service';

@ApiTags('verification')
@ApiBearerAuth()
@ApiHeader({ name: 'x-branch-id', required: false })
@ApiHeader({ name: 'x-warehouse-id', required: false })
@UseGuards(JwtAuthGuard)
@Controller('api/verification')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Post('barcode')
  @UseGuards(PermissionsGuard)
  @Permissions('verification.scan')
  verifyBarcode(@Req() req: Request, @Body() dto: VerifyBarcodeDto) {
    return this.verificationService.verifyBarcode(req, dto);
  }

  @Post('product-availability')
  @UseGuards(PermissionsGuard)
  @Permissions('verification.view')
  verifyProductAvailability(@Body() dto: VerifyProductAvailabilityDto) {
    return this.verificationService.verifyProductAvailability(dto);
  }

  @Post('pos-sale')
  @UseGuards(PermissionsGuard)
  @Permissions('verification.view')
  verifyPosSale(@Body() dto: VerifyPosSaleDto) {
    return this.verificationService.verifyPosSale(dto);
  }

  @Get('history')
  @UseGuards(PermissionsGuard)
  @Permissions('verification.view')
  history(@Query() query: QueryBarcodeVerificationsDto) {
    return this.verificationService.history(query);
  }

  @Get('history/:id')
  @UseGuards(PermissionsGuard)
  @Permissions('verification.view')
  historyById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.verificationService.historyById(id);
  }
}
