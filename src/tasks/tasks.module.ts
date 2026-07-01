import { Module } from '@nestjs/common';
import { AccessPolicyModule } from '../access-policy/access-policy.module';
import { AuditModule } from '../audit/audit.module';
import { QaModule } from '../qa/qa.module';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [AuditModule, AccessPolicyModule, QaModule],
  controllers: [TasksController],
  providers: [TasksService]
})
export class TasksModule {}
