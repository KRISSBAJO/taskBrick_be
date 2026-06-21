import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { ObservabilityModule } from '../observability/observability.module';
import { HealthController } from './health.controller';

@Module({
  imports: [TerminusModule, ObservabilityModule],
  controllers: [HealthController]
})
export class HealthModule {}
