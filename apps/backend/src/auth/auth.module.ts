import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { PasswordModule } from 'src/password/password.module';
import { RedisModule } from 'src/redis/redis.module';
import { PrismaModule } from 'src/PrismaModule';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [JwtModule.register({}), PasswordModule, RedisModule, PrismaModule],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
