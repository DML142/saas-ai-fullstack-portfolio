import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
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
  ) {}

  async issueToken(userId: string, familyId: string = randomUUID()) {
    const accessToken = this.jwtService.sign(
      { sub: userId },
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

    return { accessToken, refreshToken };
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

    return this.issueToken(token.sub, token.familyId);
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
      select: { id: true, email: true, createdAt: true, updatedAt: true },
    });

    const token = await this.issueToken(user.id);

    return {
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      ...user,
    };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Email or password is wrong');
    }

    const isPasswordRight = await this.passwordService.compare(
      password,
      user.passwordHash,
    );

    if (!isPasswordRight) {
      throw new UnauthorizedException('Email or password is wrong');
    }

    const token = await this.issueToken(user.id);

    const { passwordHash: _, ...safeUser } = user;

    return {
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      ...safeUser,
    };
  }
}
