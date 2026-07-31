import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

@Injectable()
export class MailService {
  constructor(@InjectQueue('email') private emailQueue: Queue) {}

  async queueVerificationEmail(to: string, token: string) {
    await this.emailQueue.add('verification', { to, token });
  }
  async queuePasswordResetEmail(to: string, token: string) {
    await this.emailQueue.add('reset', { to, token });
  }

  async queuePaymentFailedEmail(to: string) {
    await this.emailQueue.add('payment_failed', { to });
  }
  async queueSubscriptionConfirmedEmail(to: string) {
    await this.emailQueue.add('subscription_confirmed', { to });
  }
}
