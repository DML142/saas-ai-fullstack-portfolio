import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from 'src/PrismaService';

@Controller('health')
export class HealthController {
  constructor(private prismaService: PrismaService) {}

  @Get()
  async get() {
    try {
      return await this.prismaService.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException('Database unreachable');
    }
  }
}
