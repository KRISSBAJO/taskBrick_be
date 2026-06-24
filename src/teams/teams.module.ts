import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';

@Module({
  imports: [AuditModule, AuthModule, NotificationsModule],
  controllers: [TeamsController],
  providers: [TeamsService]
})
export class TeamsModule {}
