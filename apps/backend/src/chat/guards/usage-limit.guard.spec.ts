import { ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UsageLimitGuard } from './usage-limit.guard';
import { BillingService } from 'src/billing/billing.service';
import { RedisService } from 'src/redis/redis.service';

describe('UsageLimitGuard', () => {
  let guard: UsageLimitGuard;
  let billingService: { getEffectiveTier: jest.Mock };
  let redisService: { get: jest.Mock };

  const makeContext = (userId?: string): ExecutionContext => {
    const request = { user: userId ? { userId } : undefined };
    return {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    billingService = { getEffectiveTier: jest.fn() };
    redisService = { get: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsageLimitGuard,
        { provide: BillingService, useValue: billingService },
        { provide: RedisService, useValue: redisService },
      ],
    }).compile();

    guard = module.get<UsageLimitGuard>(UsageLimitGuard);
  });

  it('allows a request under the tier limit', async () => {
    billingService.getEffectiveTier.mockResolvedValue('FREE');
    redisService.get.mockResolvedValue('10');

    await expect(guard.canActivate(makeContext('u1'))).resolves.toBe(true);
  });

  it('allows an ULTRA user through without checking Redis (null limit = unlimited)', async () => {
    billingService.getEffectiveTier.mockResolvedValue('ULTRA');

    await expect(guard.canActivate(makeContext('u1'))).resolves.toBe(true);
    expect(redisService.get).not.toHaveBeenCalled();
  });

  it('rejects with a structured 403 body once usage reaches the limit', async () => {
    billingService.getEffectiveTier.mockResolvedValue('FREE');
    redisService.get.mockResolvedValue('50');

    await expect(guard.canActivate(makeContext('u1'))).rejects.toMatchObject({
      status: 403,
      response: { tier: 'FREE', limit: 50, used: 50 },
    });
  });

  it('only peeks the counter — never increments it itself', async () => {
    billingService.getEffectiveTier.mockResolvedValue('FREE');
    redisService.get.mockResolvedValue('0');

    await guard.canActivate(makeContext('u1'));

    expect(redisService.get).toHaveBeenCalledTimes(1);
  });

  it('fails open when Redis is unavailable', async () => {
    billingService.getEffectiveTier.mockResolvedValue('FREE');
    redisService.get.mockRejectedValue(new Error('connection refused'));

    await expect(guard.canActivate(makeContext('u1'))).resolves.toBe(true);
  });

  it('allows through when there is no authenticated user on the request', async () => {
    await expect(guard.canActivate(makeContext(undefined))).resolves.toBe(true);
    expect(billingService.getEffectiveTier).not.toHaveBeenCalled();
  });
});
