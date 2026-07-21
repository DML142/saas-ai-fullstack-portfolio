import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from 'src/PrismaService';
import { CANNED_REPLIES } from './canned-replies';
import { ChatGateway } from './chat.gateway';

@Processor('chat-reply')
export class ChatReplyProcessor extends WorkerHost {
  constructor(
    private prisma: PrismaService,
    private gateway: ChatGateway,
  ) {
    super();
  }

  async process(job: Job<{ workspaceId: string; userId: string }>) {
    await new Promise((resolve) =>
      setTimeout(resolve, 1000 + Math.random() * 2000),
    );

    const message = await this.prisma.message.create({
      data: {
        workspaceId: job.data.workspaceId,
        role: 'ASSISTANT',
        content:
          CANNED_REPLIES[Math.floor(Math.random() * CANNED_REPLIES.length)],
      },
    });

    this.gateway.pushMessage(job.data.userId, message);

    return message;
  }
}
