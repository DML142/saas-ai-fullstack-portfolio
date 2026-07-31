import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from 'src/auth/guards/jwt.auth.guard';
import { Role } from 'generated/prisma/enums';
import { BillingService } from './billing.service';
import { CheckoutDto } from './dto/checkout.dto';

@ApiTags('Billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('checkout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Create a Stripe Checkout session for a paid tier' })
  @ApiOkResponse({
    description: 'Hosted Checkout URL to redirect the user to',
    schema: {
      example: { url: 'https://checkout.stripe.com/c/pay/cs_test_...' },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  async checkout(@Req() req: Request, @Body() body: CheckoutDto) {
    const user = req.user as { userId: string; role: Role };
    const url = await this.billingService.createCheckoutSession(
      user.userId,
      body.tier,
    );
    return { url };
  }

  @Post('portal')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Open the Stripe Billing Portal for the current user',
  })
  @ApiOkResponse({
    description: 'Billing Portal URL to redirect the user to',
    schema: { example: { url: 'https://billing.stripe.com/p/session/...' } },
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  async portal(@Req() req: Request) {
    const user = req.user as { userId: string; role: Role };
    const url = await this.billingService.createPortalSession(user.userId);
    return { url };
  }
}
