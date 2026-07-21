import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from 'src/PrismaService';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('chat-reply') private replyQueue: Queue,
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
    await this.replyQueue.add('generate-reply', { workspaceId, userId });
    return message;
  }
}
