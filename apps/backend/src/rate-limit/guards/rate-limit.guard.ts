import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { RedisService } from 'src/redis/redis.service';
import {
  RATE_LIMIT_KEY,
  RateLimitOptions,
} from '../decorators/rate-limit.decorator';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private reflector: Reflector,
    private redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    const routeKey = `${context.getClass().name}:${context.getHandler().name}`;
    const key = `rateLimit: ${routeKey}:${request.ip ?? 'unknown'}`;

    const count = await this.redisService.incrementWithExpiry(
      key,
      options.windowSeconds,
    );

    if (count === null) {
      this.logger.warn(`Rate limit for ${key} isn't set`);
      return true;
    }

    if (count > options.limit) {
      const response = context.switchToHttp().getResponse<Response>();
      response.setHeader('Retry-After', options.windowSeconds);

      throw new HttpException(
        'Too many requests',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
