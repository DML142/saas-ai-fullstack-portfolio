import {
  Body,
  Controller,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Response, Request } from 'express';

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

  @Post('login')
  async login(
    @Body() body: { email: string; password: string },
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
    @Body() body: { email: string; password: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { refreshToken, ...rest } = await this.authService.register(
      body.email,
      body.password,
    );

    this.setRefreshTokenCookie(res, refreshToken);

    return rest;
  }
}
