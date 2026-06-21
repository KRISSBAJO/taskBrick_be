import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AccessControlController } from './access-control.controller';
import { AccessControlService } from './access-control.service';

@Module({
  imports: [AuditModule],
  controllers: [AccessControlController],
  providers: [AccessControlService]
})
export class AccessControlModule {}
