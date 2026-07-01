import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { MarketingController } from './marketing.controller';
import { MarketingService } from './marketing.service';

@Module({
  imports: [MailModule],
  controllers: [MarketingController],
  providers: [MarketingService],
  exports: [MarketingService]
})
export class MarketingModule {}
