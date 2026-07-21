import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { PrismaModule } from 'src/PrismaModule';
import { PassportModule } from '@nestjs/passport';
import { BullModule } from '@nestjs/bullmq';
import Redis from 'ioredis';
import { ChatReplyProcessor } from './chat-reply.processor';

const connection = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    BullModule.forRoot({ connection }),
    BullModule.registerQueue({ name: 'chat-reply' }),
  ],
  providers: [ChatService, ChatReplyProcessor],
  controllers: [ChatController],
})
export class ChatModule {}
