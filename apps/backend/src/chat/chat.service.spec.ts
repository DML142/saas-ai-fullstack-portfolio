import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { NotFoundException } from '@nestjs/common';
import { ChatService } from './chat.service';
import { PrismaService } from 'src/PrismaService';
import { BillingService } from 'src/billing/billing.service';
import { RedisService } from 'src/redis/redis.service';
import { ImportWorkspaceDto } from './dto/import-workspace.dto';

describe('ChatService', () => {
  let service: ChatService;
  let prisma: {
    workspace: { findUnique: jest.Mock; create: jest.Mock };
    message: { create: jest.Mock; findMany: jest.Mock };
  };
  let queue: { add: jest.Mock };
  let billingService: { getEffectiveTier: jest.Mock };
  let redisService: { incrementWithExpiry: jest.Mock; get: jest.Mock };

  beforeEach(async () => {
    prisma = {
      workspace: { findUnique: jest.fn(), create: jest.fn() },
      message: { create: jest.fn(), findMany: jest.fn() },
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

  describe('exportWorkspace', () => {
    it('returns the workspace name and its messages in chronological order', async () => {
      prisma.workspace.findUnique.mockResolvedValue({ name: 'My chat' });
      const firstMessageAt = new Date('2026-01-01T00:00:00.000Z');
      const secondMessageAt = new Date('2026-01-02T00:00:00.000Z');
      prisma.message.findMany.mockResolvedValue([
        { role: 'USER', content: 'hi', createdAt: firstMessageAt },
        { role: 'ASSISTANT', content: 'hello', createdAt: secondMessageAt },
      ]);

      const result = await service.exportWorkspace('u1', 'w1');

      expect(prisma.message.findMany).toHaveBeenCalledWith({
        where: { workspaceId: 'w1' },
        orderBy: { createdAt: 'asc' },
        select: { role: true, content: true, createdAt: true },
      });
      expect(result).toMatchObject({
        version: 1,
        name: 'My chat',
        messages: [
          { role: 'USER', content: 'hi', createdAt: firstMessageAt },
          { role: 'ASSISTANT', content: 'hello', createdAt: secondMessageAt },
        ],
      });
      expect(typeof result.exportedAt).toBe('string');
    });

    it('throws NotFoundException for another user’s workspace, without leaking messages', async () => {
      prisma.workspace.findUnique.mockResolvedValue(null);

      await expect(service.exportWorkspace('u1', 'w1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.message.findMany).not.toHaveBeenCalled();
    });
  });

  describe('importWorkspace', () => {
    it('creates the workspace and all its messages in one nested call, preserving a provided createdAt', async () => {
      const dto: ImportWorkspaceDto = {
        version: 1,
        name: 'Restored chat',
        messages: [
          {
            role: 'USER',
            content: 'hi',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
          { role: 'ASSISTANT', content: 'hello' },
        ],
      };
      const created = { id: 'w2', userId: 'u1', name: dto.name };
      prisma.workspace.create.mockResolvedValue(created);

      const result = await service.importWorkspace('u1', dto);

      expect(prisma.workspace.create).toHaveBeenCalledWith({
        data: {
          userId: 'u1',
          name: 'Restored chat',
          messages: {
            create: [
              {
                role: 'USER',
                content: 'hi',
                createdAt: new Date('2026-01-01T00:00:00.000Z'),
              },
              { role: 'ASSISTANT', content: 'hello', createdAt: undefined },
            ],
          },
        },
      });
      expect(result).toBe(created);
    });

    it('falls back to the schema default when a message omits createdAt', async () => {
      prisma.workspace.create.mockResolvedValue({});

      await service.importWorkspace('u1', {
        version: 1,
        name: 'x',
        messages: [{ role: 'USER', content: 'no timestamp' }],
      });

      const [[call]] = prisma.workspace.create.mock.calls as [
        [{ data: { messages: { create: { createdAt?: Date }[] } } }],
      ];
      expect(call.data.messages.create[0].createdAt).toBeUndefined();
    });
  });
});
