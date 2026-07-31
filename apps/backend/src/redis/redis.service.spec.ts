import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from './redis.service';

// RedisService news up an ioredis client in its constructor; mock it so no real
// connection is opened during the test.
jest.mock('ioredis');

describe('RedisService', () => {
  let service: RedisService;

  beforeEach(async () => {
    process.env.REDIS_URL = 'redis://localhost:6379';

    const module: TestingModule = await Test.createTestingModule({
      providers: [RedisService],
    }).compile();

    service = module.get<RedisService>(RedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
