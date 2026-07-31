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

  describe('incrementWithExpiry', () => {
    let client: { incr: jest.Mock; expire: jest.Mock };

    beforeEach(() => {
      client = (
        service as unknown as {
          client: { incr: jest.Mock; expire: jest.Mock };
        }
      ).client;
    });

    it('sets an expiry on the first increment for a key', async () => {
      client.incr.mockResolvedValue(1);
      client.expire.mockResolvedValue(1);

      const count = await service.incrementWithExpiry('key', 60);

      expect(count).toBe(1);
      expect(client.expire).toHaveBeenCalledWith('key', 60);
    });

    it('does not reset the expiry on subsequent increments within the window', async () => {
      client.incr.mockResolvedValue(2);

      const count = await service.incrementWithExpiry('key', 60);

      expect(count).toBe(2);
      expect(client.expire).not.toHaveBeenCalled();
    });

    it('returns null instead of throwing when Redis is unreachable', async () => {
      client.incr.mockRejectedValue(new Error('connection refused'));

      const count = await service.incrementWithExpiry('key', 60);

      expect(count).toBeNull();
    });
  });
});
