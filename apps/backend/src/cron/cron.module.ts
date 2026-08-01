import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/PrismaModule';
import { AvatarCleanupService } from './avatar-cleanup.service';
import { WebhookEventCleanupService } from './webhook-event-cleanup.service';

@Module({
  imports: [PrismaModule],
  providers: [AvatarCleanupService, WebhookEventCleanupService],
})
export class CronModule {}
