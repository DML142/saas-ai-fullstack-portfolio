import { InjectQueue } from '@nestjs/bullmq';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import { BillingService } from 'src/billing/billing.service';
import { PrismaService } from 'src/PrismaService';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { Prisma } from 'generated/prisma/client';
import { Role } from 'generated/prisma/enums';
import { ListSubscriptionsQueryDto } from './dto/list-subscriptions-query.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billing: BillingService,
    @InjectQueue('email') private readonly emailQueue: Queue,
    @InjectQueue('chat-reply') private readonly chatReplyQueue: Queue,
  ) {}

  async listUsers(query: ListUsersQueryDto) {
    const { page, limit, search } = query;
    const where: Prisma.UserWhereInput = search
      ? { email: { contains: search, mode: 'insensitive' } }
      : {};

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          role: true,
          emailVerified: true,
          avatarUrl: true,
          createdAt: true,
          subscription: { select: { tier: true, status: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async getUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        emailVerified: true,
        avatarUrl: true,
        stripeCustomerId: true,
        createdAt: true,
        updatedAt: true,
        subscription: true,
        _count: { select: { workspaces: true } },
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateUserRole(actingUserId: string, targetId: string, role: Role) {
    if (targetId === actingUserId) {
      throw new ForbiddenException('Cannot change your own role');
    }

    const target = await this.prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true },
    });
    if (!target) throw new NotFoundException('User not found');

    return this.prisma.user.update({
      where: { id: targetId },
      data: { role },
      select: { id: true, email: true, role: true },
    });
  }

  async listSubscriptions(query: ListSubscriptionsQueryDto) {
    const { page, limit } = query;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.subscription.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { email: true } } },
      }),
      this.prisma.subscription.count(),
    ]);
    return { data, total, page, limit };
  }

  async cancelSubscription(userId: string) {
    await this.billing.cancelSubscription(userId);
    return { status: 'canceling' };
  }

  async getStats() {
    const [totalUsers, usersByRole, subscriptionsByTier, signups] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
        this.prisma.subscription.groupBy({
          by: ['tier'],
          _count: { _all: true },
        }),
        this.prisma.$queryRaw<{ day: Date; count: number }[]>`
          SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::int AS count
          FROM "User"
          WHERE "createdAt" >= NOW() - INTERVAL '30 days'
          GROUP BY day
          ORDER BY day ASC
        `,
      ]);

    return {
      totalUsers,
      usersByRole: usersByRole.map((r) => ({
        role: r.role,
        count: r._count._all,
      })),
      subscriptionsByTier: subscriptionsByTier.map((s) => ({
        tier: s.tier,
        count: s._count._all,
      })),
      signups: signups.map((s) => ({ day: s.day, count: Number(s.count) })),
    };
  }

  async getQueues() {
    const [email, chatReply] = await Promise.all([
      this.emailQueue.getJobCounts(),
      this.chatReplyQueue.getJobCounts(),
    ]);
    return [
      { name: 'email', counts: email },
      { name: 'chat-reply', counts: chatReply },
    ];
  }
}
