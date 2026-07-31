import { SetMetadata } from '@nestjs/common';
import { SubscriptionTier } from 'generated/prisma/enums';

export const MIN_TIER_KEY = 'minTier';

export const MinTier = (tier: SubscriptionTier) =>
  SetMetadata(MIN_TIER_KEY, tier);
