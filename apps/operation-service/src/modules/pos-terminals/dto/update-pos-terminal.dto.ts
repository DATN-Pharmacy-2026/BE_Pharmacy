import { PartialType } from '@nestjs/swagger';
import { CreatePosTerminalDto } from './create-pos-terminal.dto';

export class UpdatePosTerminalDto extends PartialType(CreatePosTerminalDto) {}
