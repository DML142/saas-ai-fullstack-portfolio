import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Queue } from 'bullmq';
import { TIER_MESSAGE_LIMITS } from 'src/billing/billing.config';
import { BillingService } from 'src/billing/billing.service';
import { PrismaService } from 'src/PrismaService';
import { RedisService } from 'src/redis/redis.service';
import { getUsageKey } from './usage-key.util';
import { ImportWorkspaceDto } from './dto/import-workspace.dto';

const USAGE_WINDOW_SECONDS = 60 * 60 * 24 * 32; //32 days

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('chat-reply') private replyQueue: Queue,
    private billingService: BillingService,
    private redisService: RedisService,
  ) {}

  async listWorkspaces(userId: string) {
    return this.prisma.workspace.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async postWorkspace(userId: string, name: string) {
    return this.prisma.workspace.create({
      data: {
        name,
        userId,
      },
    });
  }

  async renameWorkspace(userId: string, workspaceId: string, name: string) {
    //using updateMany cuz delete only support find by id
    const result = await this.prisma.workspace.updateMany({
      where: { id: workspaceId, userId },
      data: { name },
    });
    if (result.count === 0) throw new NotFoundException();
    return this.prisma.workspace.findUnique({ where: { id: workspaceId } });
  }

  async deleteWorkspace(userId: string, workspaceId: string) {
    const result = await this.prisma.workspace.deleteMany({
      where: { id: workspaceId, userId },
    });
    if (result.count === 0) throw new NotFoundException();
    return { id: workspaceId };
  }

  async getMessages(userId: string, workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace || workspace.userId !== userId) {
      throw new NotFoundException();
    }

    return this.prisma.message.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async sendMessage(userId: string, workspaceId: string, content: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace || workspace.userId !== userId) {
      throw new NotFoundException();
    }

    const message = await this.prisma.message.create({
      data: { workspaceId, role: 'USER', content },
    });
    await this.redisService.incrementWithExpiry(
      getUsageKey(userId),
      USAGE_WINDOW_SECONDS,
    );
    await this.replyQueue.add('generate-reply', { workspaceId, userId });
    return message;
  }

  async getUsage(userId: string) {
    const tier = await this.billingService.getEffectiveTier(userId);
    const limit = TIER_MESSAGE_LIMITS[tier];
    const used = Number(
      (await this.redisService.get(getUsageKey(userId))) ?? 0,
    );

    return { tier, used, limit };
  }

  async exportWorkspace(userId: string, workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId, userId },
      select: { name: true },
    });
    if (!workspace) {
      throw new NotFoundException('User or workspace not found');
    }

    const messages = await this.prisma.message.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
      select: { role: true, content: true, createdAt: true },
    });

    return {
      version: 1,
      name: workspace.name,
      exportedAt: new Date().toISOString(),
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      })),
    };
  }

  async importWorkspace(userId: string, dto: ImportWorkspaceDto) {
    return this.prisma.workspace.create({
      data: {
        userId,
        name: dto.name,
        messages: {
          create: dto.messages.map((m) => ({
            role: m.role,
            content: m.content,
            createdAt: m.createdAt ? new Date(m.createdAt) : undefined,
          })),
        },
      },
    });
  }
}
