import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PasswordService } from 'src/password/password.service';
import { RedisService } from 'src/redis/redis.service';
import { PrismaService } from 'src/PrismaService';
import { MailService } from 'src/mail/mail.service';
import { BillingService } from 'src/billing/billing.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      update: jest.Mock;
      create: jest.Mock;
    };
  };
  let passwordService: { compare: jest.Mock };
  let billingService: { getEffectiveTier: jest.Mock };
  let jwtService: { sign: jest.Mock };
  let redisService: {
    set: jest.Mock;
    addToFamily: jest.Mock;
    addToUserFamilies: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
    };
    passwordService = { compare: jest.fn() };
    billingService = { getEffectiveTier: jest.fn() };
    jwtService = { sign: jest.fn().mockReturnValue('signed.jwt.token') };
    redisService = {
      set: jest.fn(),
      addToFamily: jest.fn(),
      addToUserFamilies: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: jwtService },
        { provide: PasswordService, useValue: passwordService },
        { provide: RedisService, useValue: redisService },
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: {} },
        { provide: BillingService, useValue: billingService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOrCreateGoogleUser', () => {
    it('returns the existing user when googleId already matches', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'u1',
        role: 'USER',
      });

      const user = await service.findOrCreateGoogleUser(
        'google-1',
        'a@example.com',
      );

      expect(user).toEqual({ id: 'u1', role: 'USER' });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { googleId: 'google-1' },
        select: { id: true, role: true },
      });
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('links an existing password account by email when no googleId matches', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(null) // no googleId match
        .mockResolvedValueOnce({ id: 'u2' }); // email match
      prisma.user.update.mockResolvedValue({ id: 'u2', role: 'USER' });

      const user = await service.findOrCreateGoogleUser(
        'google-2',
        'existing@example.com',
      );

      expect(user).toEqual({ id: 'u2', role: 'USER' });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u2' },
        data: { googleId: 'google-2' },
        select: { id: true, role: true },
      });
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('creates a new passwordless, pre-verified account when neither matches', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(null) // no googleId match
        .mockResolvedValueOnce(null); // no email match
      prisma.user.create.mockResolvedValue({ id: 'u3', role: 'USER' });

      const user = await service.findOrCreateGoogleUser(
        'google-3',
        'new@example.com',
      );

      expect(user).toEqual({ id: 'u3', role: 'USER' });
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'new@example.com',
          googleId: 'google-3',
          emailVerified: true,
        },
        select: { id: true, role: true },
      });
    });
  });

  describe('login — OAuth-only accounts', () => {
    it('rejects with the generic invalid-credentials error when passwordHash is null', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'oauth-only@example.com',
        passwordHash: null,
        role: 'USER',
      });

      await expect(
        service.login('oauth-only@example.com', 'anything'),
      ).rejects.toThrow(UnauthorizedException);
      // Never reveal that the account has no password — same error, and no
      // bcrypt call against a null hash.
      expect(passwordService.compare).not.toHaveBeenCalled();
    });

    it('still logs in a normal password account', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'a@example.com',
        passwordHash: 'hashed',
        role: 'USER',
      });
      passwordService.compare.mockResolvedValue(true);
      billingService.getEffectiveTier.mockResolvedValue('FREE');

      const result = await service.login('a@example.com', 'correct-password');

      expect(result.id).toBe('u1');
      expect(passwordService.compare).toHaveBeenCalledWith(
        'correct-password',
        'hashed',
      );
    });
  });
});
