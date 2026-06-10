import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { CreateNotificationPreferenceDto } from './dto/create-notification-preference.dto';
import { QueryNotificationPreferencesDto } from './dto/query-notification-preferences.dto';
import { ResolveNotificationPreferenceDto } from './dto/resolve-notification-preference.dto';
import { UpdateNotificationPreferenceDto } from './dto/update-notification-preference.dto';
import { NotificationPreferencesService } from './notification-preferences.service';

@ApiTags('notification-preferences')
@ApiHeader({ name: 'x-branch-id', required: false })
@ApiHeader({ name: 'x-warehouse-id', required: false })
@Controller('api/notification-preferences')
export class NotificationPreferencesController {
  constructor(private readonly service: NotificationPreferencesService) {}

  @Get()
  findAll(@Query() query: QueryNotificationPreferencesDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(
    @Body() dto: CreateNotificationPreferenceDto,
    @Headers('x-branch-id') branchIdHeader?: string,
    @Headers('x-warehouse-id') warehouseIdHeader?: string,
  ) {
    return this.service.create({
      ...dto,
      branchId: dto.branchId ?? branchIdHeader,
      warehouseId: dto.warehouseId ?? warehouseIdHeader,
    });
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateNotificationPreferenceDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.remove(id);
  }

  @Post('resolve')
  resolve(
    @Body() dto: ResolveNotificationPreferenceDto,
    @Headers('x-branch-id') branchIdHeader?: string,
    @Headers('x-warehouse-id') warehouseIdHeader?: string,
  ) {
    return this.service.resolve({
      ...dto,
      branchId: dto.branchId ?? branchIdHeader,
      warehouseId: dto.warehouseId ?? warehouseIdHeader,
    });
  }
}
