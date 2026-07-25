import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { PrismaModule } from 'src/PrismaModule';
import { PassportModule } from '@nestjs/passport';
import { BullModule } from '@nestjs/bullmq';
import { ChatReplyProcessor } from './chat-reply.processor';
import { JwtModule } from '@nestjs/jwt';
import { ChatGateway } from './chat.gateway';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    BullModule.registerQueue({ name: 'chat-reply' }),
    JwtModule.register({}),
  ],
  providers: [ChatService, ChatReplyProcessor, ChatGateway],
  controllers: [ChatController],
})
export class ChatModule {}
