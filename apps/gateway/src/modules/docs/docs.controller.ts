import { Controller, Get } from '@nestjs/common';
import {
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { GatewayApiGroupDto } from './dto/gateway-api-group.dto';
import { GatewayServiceTargetDto } from './dto/gateway-service-target.dto';
import { GatewayStandardResponseDto } from './dto/gateway-standard-response.dto';
import { DocsService } from './docs.service';

@ApiTags('gateway')
@Controller('docs/gateway')
export class DocsController {
  constructor(private readonly docsService: DocsService) {}

  @Get('routes')
  @ApiOperation({ summary: 'Gateway route groups and service ownership' })
  @ApiOkResponse({ type: GatewayApiGroupDto, isArray: true })
  getRoutes() {
    return this.docsService.getRouteGroups();
  }

  @Get('services')
  @ApiOperation({ summary: 'Gateway internal service targets (safe view)' })
  @ApiOkResponse({ type: GatewayServiceTargetDto, isArray: true })
  getServices() {
    return this.docsService.getServiceTargets();
  }

  @Get('conventions')
  @ApiOperation({ summary: 'Gateway API conventions for frontend integration' })
  @ApiHeader({
    name: 'Authorization',
    required: false,
    description:
      'Bearer <accessToken>. Gateway forwards this header to internal services.',
  })
  @ApiHeader({
    name: 'x-request-id',
    required: false,
    description:
      'Optional correlation ID. Gateway reuses if provided; otherwise generates one.',
  })
  @ApiOkResponse({ type: GatewayStandardResponseDto })
  getConventions() {
    return this.docsService.getConventions();
  }
}
