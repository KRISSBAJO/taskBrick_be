import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { CollaborationModule } from '../collaboration/collaboration.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [AuditModule, CollaborationModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService]
})
export class NotificationsModule {}
