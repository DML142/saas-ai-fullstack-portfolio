import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { EmailProcessor } from './email.processor';
import { BullModule } from '@nestjs/bullmq';

@Module({
  providers: [MailService, EmailProcessor],
  exports: [MailService],
  imports: [BullModule.registerQueue({ name: 'email' })],
})
export class MailModule {}
