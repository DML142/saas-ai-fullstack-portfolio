import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { PasswordModule } from './password/password.module';
import { RedisModule } from './redis/redis.module';
import { ChatModule } from './chat/chat.module';
import Redis from 'ioredis';
import { ServeStaticModule } from '@nestjs/serve-static';
import { BullModule } from '@nestjs/bullmq';
import { MailModule } from './mail/mail.module';
import { BillingModule } from './billing/billing.module';
import { UsersModule } from './users/users.module';
import { join } from 'path';
import { AVATAR_UPLOAD_DIR } from './users/avatar-upload.config';
import { ScheduleModule } from '@nestjs/schedule';
import { CronModule } from './cron/cron.module';

const connection = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRoot({ connection }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), AVATAR_UPLOAD_DIR),
      serveRoot: '/uploads/avatars',
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    MailModule,
    PasswordModule,
    RedisModule,
    ChatModule,
    BillingModule,
    UsersModule,
    CronModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
