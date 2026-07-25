import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { PasswordModule } from './password/password.module';
import { RedisModule } from './redis/redis.module';
import { ChatModule } from './chat/chat.module';
import Redis from 'ioredis';
import { BullModule } from '@nestjs/bullmq';
import { MailModule } from './mail/mail.module';

const connection = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRoot({ connection }),
    AuthModule,
    MailModule,
    PasswordModule,
    RedisModule,
    ChatModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
