import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, randomUUID } from 'crypto';
import { Role } from 'generated/prisma/enums';
import { BillingService } from 'src/billing/billing.service';
import { MailService } from 'src/mail/mail.service';
import { PasswordService } from 'src/password/password.service';
import { PrismaService } from 'src/PrismaService';
import { RedisService } from 'src/redis/redis.service';

interface RefreshTokenPayload {
  sub: string;
  jti: string;
  familyId: string;
}

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private passwordService: PasswordService,
    private redisService: RedisService,
    private prisma: PrismaService,
    private mailService: MailService,
    private billingService: BillingService,
  ) {}

  private readonly logger = new Logger(AuthService.name);

  async issueToken(
    userId: string,
    role: Role,
    familyId: string = randomUUID(),
  ) {
    const accessToken = this.jwtService.sign(
      { sub: userId, role },
      {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: Number(process.env.JWT_ACCESS_EXPIRES_IN),
      },
    );

    const jti = randomUUID();

    const refreshToken = this.jwtService.sign(
      { sub: userId, jti, familyId },
      {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: Number(process.env.JWT_REFRESH_EXPIRES_IN),
      },
    );

    await this.redisService.set(
      `refresh:${jti}`,
      familyId,
      Number(process.env.JWT_REFRESH_EXPIRES_IN),
    );
    await this.redisService.addToFamily(familyId, jti);
    await this.redisService.addToUserFamilies(userId, familyId);

    return { accessToken, refreshToken };
  }

  private async revokeAllSessions(userId: string) {
    const families = await this.redisService.getUserFamilies(userId);
    for (const familyId of families) {
      const jtis = await this.redisService.getFamilyMembers(familyId);

      //sort undefined or null
      const tokenKeys = jtis
        .filter((jti) => Boolean(jti))
        .map((jti) => `refresh:${jti}`);

      const keysToDelete = [...tokenKeys, `family:${familyId}`];

      await this.redisService.del(...keysToDelete);
    }

    await this.redisService.del(`user:${userId}:families`);
  }

  async refresh(oldToken: string) {
    const token = this.jwtService.verify<RefreshTokenPayload>(oldToken, {
      secret: process.env.JWT_REFRESH_SECRET,
    });

    const storedFamilyId = await this.redisService.get(`refresh:${token.jti}`);

    if (!storedFamilyId) {
      const jtis = await this.redisService.getFamilyMembers(token.familyId);
      await this.redisService.del(
        ...jtis.map((j) => `refresh:${j}`),
        `family:${token.familyId}`,
      );
      throw new UnauthorizedException('Refresh token reuse');
    }
    await this.redisService.del(`refresh:${token.jti}`);
    await this.redisService.removeFromFamily(token.familyId, token.jti);

    const newUser = await this.prisma.user.findUnique({
      where: { id: token.sub },
    });

    if (!newUser) {
      throw new NotFoundException('User not found');
    }

    return this.issueToken(token.sub, newUser.role, token.familyId);
  }

  async logout(token: string) {
    const { jti, familyId } = this.jwtService.verify<RefreshTokenPayload>(
      token,
      {
        secret: process.env.JWT_REFRESH_SECRET,
      },
    );

    await this.redisService.del(`refresh:${jti}`);

    await this.redisService.removeFromFamily(familyId, jti);
  }

  async register(email: string, password: string) {
    const existingEmail = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingEmail) {
      throw new BadRequestException('Account with this email already exist.');
    }
    const passwordHash = await this.passwordService.hash(password);
    const user = await this.prisma.user.create({
      data: { email, passwordHash },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const token = await this.issueToken(user.id, user.role);

    const tier = await this.billingService.getEffectiveTier(user.id);

    try {
      await this.sendVerificationEmail(user.id, user.email);
    } catch (err) {
      this.logger.error('Failed to queue verification email', err);
    }

    return {
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      ...user,
      tier,
    };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Email or password is wrong');
    }

    const isPasswordRight = await this.passwordService.compare(
      password,
      user.passwordHash,
    );

    if (!isPasswordRight) {
      throw new UnauthorizedException('Email or password is wrong');
    }

    const token = await this.issueToken(user.id, user.role);

    const { passwordHash: _, ...safeUser } = user;

    const tier = await this.billingService.getEffectiveTier(user.id);

    return {
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      ...safeUser,
      tier,
    };
  }

  async getPublicUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const tier = await this.billingService.getEffectiveTier(userId);

    return { ...user, tier };
  }

  private async sendVerificationEmail(userId: string, email: string) {
    const token = randomBytes(32).toString('hex');
    await this.redisService.set(
      `verify:${token}`,
      userId,
      Number(process.env.EMAIL_VERIFICATION_TOKEN_TTL),
    );
    await this.mailService.queueVerificationEmail(email, token);
  }

  async resendVerificationEmail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, emailVerified: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.emailVerified)
      throw new BadRequestException('Email already verified');
    await this.sendVerificationEmail(user.id, user.email);
  }

  async verifyEmail(token: string) {
    const userId = await this.redisService.getDel(`verify:${token}`);
    if (!userId) throw new BadRequestException('Invalid or expired token');
    await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });
    if (user) {
      const token = randomBytes(32).toString('hex');
      await this.redisService.set(
        `reset:${token}`,
        user.id,
        Number(process.env.PASSWORD_RESET_TOKEN_TTL),
      );
      await this.mailService.queuePasswordResetEmail(user.email, token);
    }
    return { message: 'If email exist, we sent a reset link' };
  }

  async resetPassword(token: string, newPassword: string) {
    const userId = await this.redisService.getDel(`reset:${token}`);
    if (!userId) throw new BadRequestException('Invalid or expired token');
    const passwordHash = await this.passwordService.hash(newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    await this.revokeAllSessions(userId);
  }

  async findOrCreateGoogleUser(googleId: string, email: string) {
    const byGoogleId = await this.prisma.user.findUnique({
      where: { googleId },
      select: { id: true, role: true },
    });
    if (byGoogleId) return byGoogleId;

    const byEmail = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (byEmail) {
      return this.prisma.user.update({
        where: { id: byEmail.id },
        data: { googleId },
        select: { id: true, role: true },
      });
    }

    return this.prisma.user.create({
      data: { email, googleId, emailVerified: true },
      select: { id: true, role: true },
    });
  }
}
