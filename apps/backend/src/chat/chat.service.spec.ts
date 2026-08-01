import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { NotFoundException } from '@nestjs/common';
import { ChatService } from './chat.service';
import { PrismaService } from 'src/PrismaService';
import { BillingService } from 'src/billing/billing.service';
import { RedisService } from 'src/redis/redis.service';

describe('ChatService', () => {
  let service: ChatService;
  let prisma: {
    workspace: { findUnique: jest.Mock };
    message: { create: jest.Mock };
  };
  let queue: { add: jest.Mock };
  let billingService: { getEffectiveTier: jest.Mock };
  let redisService: { incrementWithExpiry: jest.Mock; get: jest.Mock };

  beforeEach(async () => {
    prisma = {
      workspace: { findUnique: jest.fn() },
      message: { create: jest.fn() },
    };
    queue = { add: jest.fn() };
    billingService = { getEffectiveTier: jest.fn() };
    redisService = { incrementWithExpiry: jest.fn(), get: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: PrismaService, useValue: prisma },
        { provide: getQueueToken('chat-reply'), useValue: queue },
        { provide: BillingService, useValue: billingService },
        { provide: RedisService, useValue: redisService },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendMessage', () => {
    it("increments this month's usage counter after the message is created", async () => {
      prisma.workspace.findUnique.mockResolvedValue({ id: 'w1', userId: 'u1' });
      prisma.message.create.mockResolvedValue({ id: 'm1', content: 'hi' });

      await service.sendMessage('u1', 'w1', 'hi');

      expect(redisService.incrementWithExpiry).toHaveBeenCalledWith(
        expect.stringContaining('usage:messages:u1:'),
        expect.any(Number),
      );
    });

    it('rejects a send to a workspace the user does not own, without touching usage', async () => {
      prisma.workspace.findUnique.mockResolvedValue({
        id: 'w1',
        userId: 'someone-else',
      });

      await expect(
        service.sendMessage('u1', 'w1', 'hi'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.message.create).not.toHaveBeenCalled();
      expect(redisService.incrementWithExpiry).not.toHaveBeenCalled();
    });
  });

  describe('getUsage', () => {
    it('returns tier, used, and limit for a capped tier', async () => {
      billingService.getEffectiveTier.mockResolvedValue('FREE');
      redisService.get.mockResolvedValue('12');

      expect(await service.getUsage('u1')).toEqual({
        tier: 'FREE',
        used: 12,
        limit: 50,
      });
    });

    it('reports used: 0 when nothing has been sent yet this month', async () => {
      billingService.getEffectiveTier.mockResolvedValue('LITE');
      redisService.get.mockResolvedValue(null);

      expect((await service.getUsage('u1')).used).toBe(0);
    });

    it('reports a null limit for ULTRA', async () => {
      billingService.getEffectiveTier.mockResolvedValue('ULTRA');
      redisService.get.mockResolvedValue('999');

      expect((await service.getUsage('u1')).limit).toBeNull();
    });
  });
});
