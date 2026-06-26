import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { InternalMailModule } from '../internal-mail/internal-mail.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';

@Module({
  imports: [AuditModule, InternalMailModule, NotificationsModule],
  controllers: [AccountController],
  providers: [AccountService]
})
export class AccountModule {}
