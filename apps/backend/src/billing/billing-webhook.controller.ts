import { Controller, Headers, HttpCode, Post, Req } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { BillingService } from './billing.service';

@ApiTags('Billing')
@Controller('billing')
export class BillingWebhookController {
  constructor(private readonly billingService: BillingService) {}

  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Stripe webhook receiver (called by Stripe, not by clients)',
    description:
      'Verifies the Stripe signature over the raw request body and syncs subscription state. Requires the raw body and a valid `stripe-signature` header — not callable from Swagger UI.',
  })
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    await this.billingService.handleWebhookEvent(req.rawBody, signature);
    return { received: true };
  }
}
