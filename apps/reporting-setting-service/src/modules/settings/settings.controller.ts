import { Body, Controller, Delete, Get, Headers, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { CreateSettingDto } from './dto/create-setting.dto';
import { QuerySettingsDto } from './dto/query-settings.dto';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@ApiHeader({ name: 'x-branch-id', required: false })
@ApiHeader({ name: 'x-warehouse-id', required: false })
@Controller('api/settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  findAll(@Query() query: QuerySettingsDto) {
    return this.settingsService.findAll(query);
  }

  @Get('key/:key')
  findByKey(
    @Param('key') key: string,
    @Query('branchId') branchId?: string,
    @Headers('x-branch-id') branchIdHeader?: string,
  ) {
    return this.settingsService.findByKey(key, branchId ?? branchIdHeader);
  }

  @Get('effective/:key')
  effective(
    @Param('key') key: string,
    @Query('branchId') branchId?: string,
    @Headers('x-branch-id') branchIdHeader?: string,
  ) {
    return this.settingsService.resolveEffective(key, branchId ?? branchIdHeader);
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.settingsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateSettingDto) {
    return this.settingsService.create(dto);
  }

  @Patch('key/:key')
  updateByKey(
    @Param('key') key: string,
    @Body() dto: UpdateSettingDto,
    @Query('branchId') branchId?: string,
    @Headers('x-branch-id') branchIdHeader?: string,
  ) {
    return this.settingsService.updateByKey(key, dto, branchId ?? branchIdHeader);
  }

  @Patch(':id')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateSettingDto) {
    return this.settingsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.settingsService.remove(id);
  }
}
