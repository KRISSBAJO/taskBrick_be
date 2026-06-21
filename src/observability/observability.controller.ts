import { Controller, Get, Header, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { ObservabilityService } from './observability.service';

@ApiTags('observability')
@Controller()
export class ObservabilityController {
  constructor(private readonly observabilityService: ObservabilityService) {}

  @Get('observability/status')
  @Version('1')
  @ApiOperation({ summary: 'Observability module readiness check' })
  status() {
    return {
      module: 'observability',
      status: 'ready',
      capabilities: ['metrics', 'prometheus', 'db-latency', 'retry', 'circuit-breaker']
    };
  }

  @Get('observability/metrics')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:security')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get JSON operational metrics' })
  metrics(@CurrentUser() _user: AuthenticatedUser) {
    return this.observabilityService.metricsJson();
  }

  @Get('metrics')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:security')
  @ApiBearerAuth()
  @Header('content-type', 'text/plain; version=0.0.4; charset=utf-8')
  @ApiOperation({ summary: 'Get Prometheus-compatible metrics text' })
  prometheus(@CurrentUser() _user: AuthenticatedUser) {
    return this.observabilityService.prometheusMetrics();
  }

  @Get('observability/db-latency')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:security')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Measure database round-trip latency' })
  async dbLatency(@CurrentUser() _user: AuthenticatedUser) {
    return {
      database: {
        status: 'up',
        latencyMs: await this.observabilityService.measureDatabaseLatency()
      }
    };
  }
}
