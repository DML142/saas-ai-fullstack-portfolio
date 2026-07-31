import { SubscriptionTier } from 'generated/prisma/enums';

export type PaidTier = 'LITE' | 'PRO' | 'ULTRA';

export const TIER_TO_PRICE: Record<PaidTier, string> = {
  LITE: process.env.STRIPE_PRICE_LITE!,
  PRO: process.env.STRIPE_PRICE_PRO!,
  ULTRA: process.env.STRIPE_PRICE_ULTRA!,
};

export const PRICE_TO_TIER: Record<string, SubscriptionTier> = Object.entries(
  TIER_TO_PRICE,
).reduce<Record<string, SubscriptionTier>>((acc, [tier, priceId]) => {
  acc[priceId] = tier as SubscriptionTier;
  return acc;
}, {});

export function isPaidTier(value: string): value is PaidTier {
  return value === 'LITE' || value === 'PRO' || value === 'ULTRA';
}

export const TIER_RANK: Record<SubscriptionTier, number> = {
  FREE: 0,
  LITE: 1,
  PRO: 2,
  ULTRA: 3,
};
