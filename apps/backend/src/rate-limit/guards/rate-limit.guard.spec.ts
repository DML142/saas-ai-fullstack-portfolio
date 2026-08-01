import { ExecutionContext, HttpException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from 'src/redis/redis.service';
import { RateLimitGuard } from './rate-limit.guard';
import { RATE_LIMIT_KEY } from '../decorators/rate-limit.decorator';

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let redis: { incrementWithExpiry: jest.Mock };

  const makeContext = (ip: string): ExecutionContext => {
    const request = { ip };
    const response = { setHeader: jest.fn() };

    return {
      getHandler: () => ({ name: 'login' }),
      getClass: () => ({ name: 'AuthController' }),
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    reflector = { getAllAndOverride: jest.fn() };
    redis = { incrementWithExpiry: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitGuard,
        { provide: Reflector, useValue: reflector },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    guard = module.get<RateLimitGuard>(RateLimitGuard);
  });

  it('allows the request through when the route has no @RateLimit metadata', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    const allowed = await guard.canActivate(makeContext('1.1.1.1'));

    expect(allowed).toBe(true);
    expect(redis.incrementWithExpiry).not.toHaveBeenCalled();
  });

  it('allows the request through when the count is within the limit', async () => {
    reflector.getAllAndOverride.mockReturnValue({
      limit: 5,
      windowSeconds: 60,
    });
    redis.incrementWithExpiry.mockResolvedValue(3);

    const allowed = await guard.canActivate(makeContext('1.1.1.1'));

    expect(allowed).toBe(true);
  });

  it('rejects with 429 once the count exceeds the limit', async () => {
    reflector.getAllAndOverride.mockReturnValue({
      limit: 5,
      windowSeconds: 60,
    });
    redis.incrementWithExpiry.mockResolvedValue(6);

    await expect(
      guard.canActivate(makeContext('1.1.1.1')),
    ).rejects.toBeInstanceOf(HttpException);
  });

  it('sets a Retry-After header equal to the configured window when rejecting', async () => {
    reflector.getAllAndOverride.mockReturnValue({
      limit: 5,
      windowSeconds: 60,
    });
    redis.incrementWithExpiry.mockResolvedValue(6);
    const context = makeContext('1.1.1.1');
    const response = context
      .switchToHttp()
      .getResponse<{ setHeader: jest.Mock }>();

    await expect(guard.canActivate(context)).rejects.toThrow();

    expect(response.setHeader).toHaveBeenCalledWith('Retry-After', 60);
  });

  it('tracks distinct IPs independently under the same route key', async () => {
    reflector.getAllAndOverride.mockReturnValue({
      limit: 5,
      windowSeconds: 60,
    });
    redis.incrementWithExpiry.mockResolvedValue(1);

    await guard.canActivate(makeContext('1.1.1.1'));
    await guard.canActivate(makeContext('2.2.2.2'));

    const [firstKey] = redis.incrementWithExpiry.mock.calls[0] as [
      string,
      number,
    ];
    const [secondKey] = redis.incrementWithExpiry.mock.calls[1] as [
      string,
      number,
    ];
    expect(firstKey).not.toBe(secondKey);
    expect(firstKey).toContain('1.1.1.1');
    expect(secondKey).toContain('2.2.2.2');
  });

  it('fails open when the Redis counter is unavailable', async () => {
    reflector.getAllAndOverride.mockReturnValue({
      limit: 5,
      windowSeconds: 60,
    });
    redis.incrementWithExpiry.mockResolvedValue(null);

    const allowed = await guard.canActivate(makeContext('1.1.1.1'));

    expect(allowed).toBe(true);
  });

  it('reads metadata under the RATE_LIMIT_KEY from both handler and class', async () => {
    reflector.getAllAndOverride.mockReturnValue({
      limit: 5,
      windowSeconds: 60,
    });
    redis.incrementWithExpiry.mockResolvedValue(1);
    const context = makeContext('1.1.1.1');

    await guard.canActivate(context);

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
  });
});
