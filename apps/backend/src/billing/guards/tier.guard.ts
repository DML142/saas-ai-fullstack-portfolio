import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BillingService } from '../billing.service';
import { SubscriptionTier } from 'generated/prisma/enums';
import { MIN_TIER_KEY } from '../decorators/min-tier.decorator';
import { TIER_RANK } from '../billing.config';

@Injectable()
export class TierGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly billingService: BillingService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredTier = this.reflector.getAllAndOverride<SubscriptionTier>(
      MIN_TIER_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredTier) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: { userId: string } }>();
    const userId = request.user?.userId;
    if (!userId) {
      throw new ForbiddenException('Authentication required');
    }

    const effectiveTier = await this.billingService.getEffectiveTier(userId);

    if (TIER_RANK[effectiveTier] < TIER_RANK[requiredTier]) {
      throw new ForbiddenException(
        `This feature requires the ${requiredTier} plan or higher`,
      );
    }

    return true;
  }
}
