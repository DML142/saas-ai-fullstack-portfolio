import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { PasswordModule } from 'src/password/password.module';
import { RedisModule } from 'src/redis/redis.module';
import { PrismaModule } from 'src/PrismaModule';
import { JwtStrategy } from './jwt.strategy';
import { MailModule } from 'src/mail/mail.module';
import { BillingModule } from 'src/billing/billing.module';

@Module({
  imports: [
    JwtModule.register({}),
    PasswordModule,
    RedisModule,
    PrismaModule,
    MailModule,
    BillingModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
