import { RedisModule } from 'src/redis/redis.module';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { Module } from '@nestjs/common';

@Module({
  imports: [RedisModule],
  providers: [RateLimitGuard],
  exports: [RateLimitGuard],
})
export class RateLimitModule {}
