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
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateNotificationTemplateDto } from './dto/create-notification-template.dto';
import { QueryNotificationTemplatesDto } from './dto/query-notification-templates.dto';
import { RenderNotificationTemplateDto } from './dto/render-notification-template.dto';
import { UpdateNotificationTemplateDto } from './dto/update-notification-template.dto';
import { NotificationTemplatesService } from './notification-templates.service';

@ApiTags('notification-templates')
@Controller('api/notification-templates')
export class NotificationTemplatesController {
  constructor(private readonly service: NotificationTemplatesService) {}

  @Get()
  findAll(@Query() query: QueryNotificationTemplatesDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateNotificationTemplateDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateNotificationTemplateDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.remove(id);
  }

  @Post('render')
  render(@Body() dto: RenderNotificationTemplateDto) {
    return this.service.render(dto);
  }

  @Post('seed-defaults')
  seedDefaults() {
    return this.service.seedDefaults();
  }
}
