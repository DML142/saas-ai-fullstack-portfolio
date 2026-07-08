import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor() {
    const url = process.env.REDIS_URL;

    if (!url) {
      throw new Error('Redis url not found');
    }
    this.client = new Redis(url);
  }

  async set(key: string, value: string, ttlSeconds: number) {
    await this.client.set(key, value, 'EX', ttlSeconds);
  }

  async get(key: string) {
    return this.client.get(key);
  }

  async del(...keys: string[]) {
    await this.client.del(...keys);
  }

  async addToFamily(familyId: string, jti: string) {
    await this.client.sadd(`family:${familyId}`, jti);
  }

  async getFamilyMembers(familyId: string): Promise<string[]> {
    return this.client.smembers(`family:${familyId}`);
  }

  async removeFromFamily(familyId: string, jti: string) {
    await this.client.srem(`family:${familyId}`, jti);
  }

  onModuleDestroy() {
    this.client.disconnect();
  }
}
