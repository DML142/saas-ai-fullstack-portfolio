import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Response, Request } from 'express';
import { JwtAuthGuard } from './guards/jwt.auth.guard';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { Role } from 'generated/prisma/enums';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  private setRefreshTokenCookie(res: Response, refreshToken: string) {
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: Number(process.env.JWT_REFRESH_EXPIRES_IN) * 1000,
    });
  }

  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const oldToken = req.cookies['refreshToken'] as string | undefined;

    if (!oldToken) {
      throw new UnauthorizedException();
    }

    const { refreshToken, ...rest } = await this.authService.refresh(oldToken);

    this.setRefreshTokenCookie(res, refreshToken);

    return rest;
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies['refreshToken'] as string | undefined;

    if (!token) {
      throw new UnauthorizedException();
    }

    await this.authService.logout(token);

    res.clearCookie('refreshToken');

    return true;
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: Request) {
    const user = req.user as { userId: string; role: Role };
    return this.authService.getPublicUser(user.userId);
  }

  @Post('login')
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { refreshToken, ...rest } = await this.authService.login(
      body.email,
      body.password,
    );

    this.setRefreshTokenCookie(res, refreshToken);

    return rest;
  }

  @Post('register')
  async register(
    @Body() body: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { refreshToken, ...rest } = await this.authService.register(
      body.email,
      body.password,
    );

    this.setRefreshTokenCookie(res, refreshToken);

    return rest;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin-check')
  adminCheck(@Req() req: Request) {
    return { message: 'You are admin!', user: req.user };
  }
}
