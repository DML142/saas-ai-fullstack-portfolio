import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PasswordService } from 'src/password/password.service';
import { RedisService } from 'src/redis/redis.service';
import { PrismaService } from 'src/PrismaService';
import { MailService } from 'src/mail/mail.service';
import { BillingService } from 'src/billing/billing.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: {} },
        { provide: PasswordService, useValue: {} },
        { provide: RedisService, useValue: {} },
        { provide: PrismaService, useValue: {} },
        { provide: MailService, useValue: {} },
        { provide: BillingService, useValue: {} },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
