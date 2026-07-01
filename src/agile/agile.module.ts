import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { CollaborationModule } from '../collaboration/collaboration.module';
import { AccessPolicyModule } from '../access-policy/access-policy.module';
import { QaModule } from '../qa/qa.module';
import { AgileController } from './agile.controller';
import { AgileService } from './agile.service';

@Module({
  imports: [AuditModule, CollaborationModule, AccessPolicyModule, QaModule],
  controllers: [AgileController],
  providers: [AgileService]
})
export class AgileModule {}
