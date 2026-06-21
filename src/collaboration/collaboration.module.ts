import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AccessPolicyModule } from '../access-policy/access-policy.module';
import { AuditModule } from '../audit/audit.module';
import { CollaborationController } from './collaboration.controller';
import { CollaborationService } from './collaboration.service';
import { RealtimeGateway } from './realtime.gateway';

@Module({
  imports: [AccessPolicyModule, AuditModule, JwtModule.register({})],
  controllers: [CollaborationController],
  providers: [CollaborationService, RealtimeGateway],
  exports: [RealtimeGateway]
})
export class CollaborationModule {}
