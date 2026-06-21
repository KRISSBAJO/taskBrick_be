import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { AuditModule } from '../audit/audit.module';
import { CollaborationModule } from '../collaboration/collaboration.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { MailModule } from '../mail/mail.module';
import { MeetingBookingController, PublicBookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { MeetingAiController } from './meeting-ai.controller';
import { MeetingAiService } from './meeting-ai.service';
import { MeetingAdminController } from './meeting-admin.controller';
import { MeetingAdminService } from './meeting-admin.service';
import { MeetingIntegrationsController } from './meeting-integrations.controller';
import { MeetingIntegrationsService } from './meeting-integrations.service';
import { MeetingRuntimeController } from './meeting-runtime.controller';
import { MeetingRuntimeService } from './meeting-runtime.service';
import { MeetingsController } from './meetings.controller';
import { MeetingsService } from './meetings.service';

@Module({
  imports: [AiModule, AuditModule, CollaborationModule, IntegrationsModule, MailModule],
  controllers: [
    MeetingBookingController,
    PublicBookingController,
    MeetingIntegrationsController,
    MeetingAdminController,
    MeetingAiController,
    MeetingRuntimeController,
    MeetingsController
  ],
  providers: [
    MeetingsService,
    BookingService,
    MeetingIntegrationsService,
    MeetingAdminService,
    MeetingAiService,
    MeetingRuntimeService
  ],
  exports: [MeetingIntegrationsService]
})
export class MeetingsModule {}
