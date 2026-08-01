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
import {
  ApiFoundResponse,
  ApiOperation,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import type { Response, Request } from 'express';
import { JwtAuthGuard } from './guards/jwt.auth.guard';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { Role } from 'generated/prisma/enums';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RateLimit } from 'src/rate-limit/decorators/rate-limit.decorator';
import { RateLimitGuard } from 'src/rate-limit/guards/rate-limit.guard';
import { GoogleAuthGuard } from './guards/google.auth.guard';

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

  @UseGuards(RateLimitGuard)
  @RateLimit(10, 60)
  @ApiTooManyRequestsResponse({
    description:
      'Too many login attempts from this IP — retry after the window elapses',
  })
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

  @UseGuards(RateLimitGuard)
  @RateLimit(5, 60)
  @ApiTooManyRequestsResponse({
    description:
      'Too many registration attempts from this IP — retry after the window elapses',
  })
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

  @UseGuards(JwtAuthGuard, RateLimitGuard)
  @RateLimit(3, 60)
  @ApiTooManyRequestsResponse({
    description:
      'Too many resend requests from this IP — retry after the window elapses',
  })
  @Post('resend-verification')
  resend(@Req() req: Request) {
    const user = req.user as { userId: string; role: Role };
    return this.authService.resendVerificationEmail(user.userId);
  }

  @UseGuards(RateLimitGuard)
  @RateLimit(10, 60)
  @ApiTooManyRequestsResponse({
    description:
      'Too many verification attempts from this IP — retry after the window elapses',
  })
  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }

  @UseGuards(RateLimitGuard)
  @RateLimit(3, 60)
  @ApiTooManyRequestsResponse({
    description:
      'Too many forgot-password requests from this IP — retry after the window elapses',
  })
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @UseGuards(RateLimitGuard)
  @RateLimit(5, 60)
  @ApiTooManyRequestsResponse({
    description:
      'Too many reset-password attempts from this IP — retry after the window elapses',
  })
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  @UseGuards(GoogleAuthGuard)
  @ApiOperation({
    summary: 'Start Google sign-in',
    description:
      'Redirects the browser to the Google OAuth consent screen. Must be ' +
      'reached via a top-level navigation, not a fetch call.',
  })
  @ApiFoundResponse({
    description: "Redirect to Google's consent screen.",
  })
  @Get('google')
  googleAuth() {}

  @UseGuards(GoogleAuthGuard)
  @ApiOperation({
    summary: 'Google sign-in callback',
    description:
      'Google redirects back here after consent. On success, issues the ' +
      'same access/refresh token pair as login/register, sets the refresh ' +
      'cookie, and redirects to the frontend. On failure or denial, ' +
      'redirects to the frontend login page with an error flag instead of ' +
      'returning a raw error response.',
  })
  @ApiFoundResponse({
    description:
      'Redirect to the frontend — the app root on success, ' +
      '/login?error=oauth_failed on failure.',
  })
  @Get('google/callback')
  async googleCallback(
    @Req() req: Request,
    @Res({ passthrough: false }) res: Response,
  ) {
    const user = req.user as { userId: string; role: Role } | undefined;
    if (!user) return;

    const { refreshToken } = await this.authService.issueToken(
      user.userId,
      user.role,
    );

    this.setRefreshTokenCookie(res, refreshToken);

    res.redirect(`${process.env.FRONTEND_URL}/`);
  }
}
