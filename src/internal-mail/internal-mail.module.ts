import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { CollaborationModule } from '../collaboration/collaboration.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { InternalMailController } from './internal-mail.controller';
import { InternalMailService } from './internal-mail.service';

@Module({
  imports: [AuditModule, CollaborationModule, NotificationsModule],
  controllers: [InternalMailController],
  providers: [InternalMailService],
  exports: [InternalMailService],
})
export class InternalMailModule {}
