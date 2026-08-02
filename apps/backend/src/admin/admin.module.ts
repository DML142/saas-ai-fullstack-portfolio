import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { PrismaModule } from 'src/PrismaModule';
import { BillingModule } from 'src/billing/billing.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    PrismaModule,
    BillingModule,
    PassportModule,
    JwtModule.register({}),
    BullModule.registerQueue({ name: 'email' }),
    BullModule.registerQueue({ name: 'chat-reply' }),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
