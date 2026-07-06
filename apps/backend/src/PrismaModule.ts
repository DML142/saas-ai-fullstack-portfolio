import { Module } from '@nestjs/common';
import { PrismaService } from './PrismaService';

@Module({
  providers: [PrismaService],
})
export class PrismaModule {}
