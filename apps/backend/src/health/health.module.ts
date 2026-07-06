import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaModule } from 'src/PrismaModule';
import { PrismaService } from 'src/PrismaService';

@Module({
  imports: [PrismaModule],
  controllers: [HealthController],
  providers: [PrismaService],
})
export class HealthModule {}
