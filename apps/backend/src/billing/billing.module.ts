import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { PrismaModule } from 'src/PrismaModule';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { StripeProvider } from './stripe.provider';
import { MailModule } from 'src/mail/mail.module';
import { BillingWebhookController } from './billing-webhook.controller';

@Module({
  imports: [PrismaModule, PassportModule, JwtModule.register({}), MailModule],
  controllers: [BillingController, BillingWebhookController],
  providers: [BillingService, StripeProvider],
  exports: [BillingService],
})
export class BillingModule {}
