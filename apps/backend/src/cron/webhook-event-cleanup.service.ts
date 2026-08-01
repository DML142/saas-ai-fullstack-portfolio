import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from 'src/PrismaService';
import {
  CRON_WEBHOOK_EVENT_CLEANUP_SCHEDULE,
  CRON_WEBHOOK_EVENT_RETENTION_DAYS,
} from './cron.config';

@Injectable()
export class WebhookEventCleanupService {
  private readonly logger = new Logger(WebhookEventCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CRON_WEBHOOK_EVENT_CLEANUP_SCHEDULE)
  async cleanupStaleWebhookEvents() {
    const startedAt = Date.now();
    this.logger.log('Webhook event cleanup started');

    try {
      const cutoff = new Date(
        Date.now() - CRON_WEBHOOK_EVENT_RETENTION_DAYS * 24 * 60 * 60 * 1000,
      );
      const { count } = await this.prisma.processedWebhookEvent.deleteMany({
        where: { processedAt: { lt: cutoff } },
      });
      this.logger.log(
        `Webhook event cleanup finished: deleted ${count} row(s) in ${Date.now() - startedAt}ms`,
      );
    } catch (err) {
      this.logger.error('Webhook event cleanup failed', err);
    }
  }
}
