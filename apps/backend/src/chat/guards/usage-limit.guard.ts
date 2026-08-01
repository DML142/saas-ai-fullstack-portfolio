import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import type { Request } from 'express';
import { BillingService } from 'src/billing/billing.service';
import { TIER_MESSAGE_LIMITS } from 'src/billing/billing.config';
import { RedisService } from 'src/redis/redis.service';
import { getUsageKey } from '../usage-key.util';

@Injectable()
export class UsageLimitGuard implements CanActivate {
  private readonly logger = new Logger(UsageLimitGuard.name);

  constructor(
    private billingService: BillingService,
    private redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as { userId: string } | undefined;
    if (!user) return true;

    const tier = await this.billingService.getEffectiveTier(user.userId);
    const limit = TIER_MESSAGE_LIMITS[tier];

    if (limit === null) {
      return true;
    }

    let raw: string | null;
    try {
      raw = await this.redisService.get(getUsageKey(user.userId));
    } catch {
      this.logger.warn('Usage check failed — Redis unavailable, failing open');
      return true;
    }

    const used = Number(raw ?? 0);

    if (used >= limit) {
      throw new ForbiddenException({
        message: 'Monthly message limit reached',
        tier,
        limit,
        used,
      });
    }

    return true;
  }
}
