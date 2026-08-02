import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { PrismaService } from 'src/PrismaService';
import { BillingService } from 'src/billing/billing.service';
import { Role } from 'generated/prisma/enums';

describe('AdminService', () => {
  let service: AdminService;
  let prisma: {
    user: {
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      groupBy: jest.Mock;
    };
    subscription: {
      findMany: jest.Mock;
      count: jest.Mock;
      groupBy: jest.Mock;
    };
    $transaction: jest.Mock;
    $queryRaw: jest.Mock;
  };
  let billing: { cancelSubscription: jest.Mock };
  let emailQueue: { getJobCounts: jest.Mock };
  let chatReplyQueue: { getJobCounts: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        groupBy: jest.fn(),
      },
      subscription: {
        findMany: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
      },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
      $queryRaw: jest.fn(),
    };
    billing = { cancelSubscription: jest.fn() };
    emailQueue = { getJobCounts: jest.fn() };
    chatReplyQueue = { getJobCounts: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: prisma },
        { provide: BillingService, useValue: billing },
        { provide: getQueueToken('email'), useValue: emailQueue },
        { provide: getQueueToken('chat-reply'), useValue: chatReplyQueue },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listUsers', () => {
    it('paginates with default page/limit and no search filter', async () => {
      prisma.user.findMany.mockResolvedValue([{ id: 'u1' }]);
      prisma.user.count.mockResolvedValue(1);

      const result = await service.listUsers({ page: 1, limit: 20 });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {}, skip: 0, take: 20 }),
      );
      expect(prisma.user.count).toHaveBeenCalledWith({ where: {} });
      expect(result).toEqual({
        data: [{ id: 'u1' }],
        total: 1,
        page: 1,
        limit: 20,
      });
    });

    it('applies a case-insensitive email search filter', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      await service.listUsers({ page: 2, limit: 10, search: 'demo' });

      const expectedWhere = {
        email: { contains: 'demo', mode: 'insensitive' },
      };
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expectedWhere, skip: 10, take: 10 }),
      );
      expect(prisma.user.count).toHaveBeenCalledWith({ where: expectedWhere });
    });
  });

  describe('getUser', () => {
    it('returns the user when found', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'a@b.com' });

      const result = await service.getUser('u1');

      expect(result).toEqual({ id: 'u1', email: 'a@b.com' });
    });

    it('throws NotFoundException when the user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getUser('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('updateUserRole', () => {
    it('updates another user’s role', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'target' });
      prisma.user.update.mockResolvedValue({
        id: 'target',
        email: 'target@example.com',
        role: Role.ADMIN,
      });

      const result = await service.updateUserRole(
        'admin1',
        'target',
        Role.ADMIN,
      );

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'target' },
        data: { role: Role.ADMIN },
        select: { id: true, email: true, role: true },
      });
      expect(result.role).toBe(Role.ADMIN);
    });

    it('refuses to change the caller’s own role', async () => {
      await expect(
        service.updateUserRole('admin1', 'admin1', Role.USER),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the target user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateUserRole('admin1', 'missing', Role.ADMIN),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('listSubscriptions', () => {
    it('paginates subscriptions with the owning user’s email', async () => {
      prisma.subscription.findMany.mockResolvedValue([
        { id: 's1', user: { email: 'a@b.com' } },
      ]);
      prisma.subscription.count.mockResolvedValue(1);

      const result = await service.listSubscriptions({ page: 1, limit: 20 });

      expect(prisma.subscription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
          include: { user: { select: { email: true } } },
        }),
      );
      expect(result).toEqual({
        data: [{ id: 's1', user: { email: 'a@b.com' } }],
        total: 1,
        page: 1,
        limit: 20,
      });
    });
  });

  describe('cancelSubscription', () => {
    it('delegates to BillingService and does not touch Prisma directly', async () => {
      billing.cancelSubscription.mockResolvedValue(undefined);

      const result = await service.cancelSubscription('u1');

      expect(billing.cancelSubscription).toHaveBeenCalledWith('u1');
      expect(prisma.subscription.findMany).not.toHaveBeenCalled();
      expect(result).toEqual({ status: 'canceling' });
    });
  });

  describe('getStats', () => {
    it('shapes counts, role/tier breakdowns, and the signup series', async () => {
      prisma.user.count.mockResolvedValue(5);
      prisma.user.groupBy.mockResolvedValue([
        { role: Role.USER, _count: { _all: 4 } },
        { role: Role.ADMIN, _count: { _all: 1 } },
      ]);
      prisma.subscription.groupBy.mockResolvedValue([
        { tier: 'PRO', _count: { _all: 2 } },
      ]);
      prisma.$queryRaw.mockResolvedValue([
        { day: new Date('2026-08-01'), count: 3 },
      ]);

      const result = await service.getStats();

      expect(result).toEqual({
        totalUsers: 5,
        usersByRole: [
          { role: Role.USER, count: 4 },
          { role: Role.ADMIN, count: 1 },
        ],
        subscriptionsByTier: [{ tier: 'PRO', count: 2 }],
        signups: [{ day: new Date('2026-08-01'), count: 3 }],
      });
    });
  });

  describe('getQueues', () => {
    it('returns job counts for both application queues', async () => {
      emailQueue.getJobCounts.mockResolvedValue({ waiting: 1, active: 0 });
      chatReplyQueue.getJobCounts.mockResolvedValue({ waiting: 0, active: 2 });

      const result = await service.getQueues();

      expect(result).toEqual([
        { name: 'email', counts: { waiting: 1, active: 0 } },
        { name: 'chat-reply', counts: { waiting: 0, active: 2 } },
      ]);
    });
  });
});
