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

  //set { key: value } and ttl
  async set(key: string, value: string, ttlSeconds: number) {
    await this.client.set(key, value, 'EX', ttlSeconds);
  }

  //get value by key
  async get(key: string) {
    return this.client.get(key);
  }

  //delete value(s) by key(s)
  async del(...keys: string[]) {
    await this.client.del(...keys);
  }

  //add 'family:familyKey' and jti value to set
  async addToFamily(familyId: string, jti: string) {
    await this.client.sadd(`family:${familyId}`, jti);
  }

  //get members of this family
  async getFamilyMembers(familyId: string): Promise<string[]> {
    return this.client.smembers(`family:${familyId}`);
  }

  //remove jwi from this family
  async removeFromFamily(familyId: string, jti: string) {
    await this.client.srem(`family:${familyId}`, jti);
  }

  //get value and delete
  async getDel(key: string): Promise<string | null> {
    return this.client.getdel(key);
  }

  //add now user to familes (to see which families belong to exact user)
  async addToUserFamilies(userId: string, familyId: string) {
    await this.client.sadd(`user:${userId}:families`, familyId);
  }

  //get it
  async getUserFamilies(userId: string): Promise<string[]> {
    return this.client.smembers(`user:${userId}:families`);
  }

  onModuleDestroy() {
    this.client.disconnect();
  }
}
