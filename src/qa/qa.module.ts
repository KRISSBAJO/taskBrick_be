import { Module } from '@nestjs/common';
import { AccessPolicyModule } from '../access-policy/access-policy.module';
import { AuditModule } from '../audit/audit.module';
import { QaController } from './qa.controller';
import { QaService } from './qa.service';

@Module({
  imports: [AccessPolicyModule, AuditModule],
  controllers: [QaController],
  providers: [QaService],
  exports: [QaService]
})
export class QaModule {}
