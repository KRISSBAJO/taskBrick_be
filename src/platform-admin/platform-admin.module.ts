import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { CollaborationModule } from '../collaboration/collaboration.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { MailModule } from '../mail/mail.module';
import { ObservabilityModule } from '../observability/observability.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PlatformAdminController } from './platform-admin.controller';
import { PlatformAdminGuard } from './guards/platform-admin.guard';
import { PlatformAdminService } from './platform-admin.service';

@Module({
  imports: [PrismaModule, AuditModule, MailModule, ObservabilityModule, CollaborationModule, IntegrationsModule],
  controllers: [PlatformAdminController],
  providers: [PlatformAdminService, PlatformAdminGuard],
  exports: [PlatformAdminService]
})
export class PlatformAdminModule {}
