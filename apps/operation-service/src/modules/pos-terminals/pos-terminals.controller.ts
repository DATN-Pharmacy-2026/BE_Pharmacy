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
import { CreatePosTerminalDto } from './dto/create-pos-terminal.dto';
import { QueryPosTerminalsDto } from './dto/query-pos-terminals.dto';
import { UpdatePosTerminalDto } from './dto/update-pos-terminal.dto';
import { PosTerminalsService } from './pos-terminals.service';

@ApiTags('pos-terminals')
@Controller('api/pos-terminals')
export class PosTerminalsController {
  constructor(private readonly posTerminalsService: PosTerminalsService) {}

  @Get()
  findAll(@Query() query: QueryPosTerminalsDto) {
    return this.posTerminalsService.findAll(query);
  }

  @Get('code/:code')
  findByCode(@Param('code') code: string) {
    return this.posTerminalsService.findByCode(code);
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.posTerminalsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreatePosTerminalDto) {
    return this.posTerminalsService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdatePosTerminalDto,
  ) {
    return this.posTerminalsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.posTerminalsService.remove(id);
  }
}
