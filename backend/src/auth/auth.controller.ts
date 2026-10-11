import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './auth.guard';
import { CsrfGuard } from './csrf.guard';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.login(dto.username, dto.password);
    const secure = process.env.NODE_ENV === 'production' || process.env.COOKIE_SECURE === 'true';
    const sameSite: 'none' | 'lax' = secure ? 'none' : 'lax';
    const cookieOptions = { secure, sameSite, path: '/' } as const;
    res.cookie('flotabus_session', result.token, { ...cookieOptions, httpOnly: true, maxAge: 8 * 60 * 60 * 1000 });
    const csrfToken = randomUUID();
    res.cookie('flotabus_csrf', csrfToken, { ...cookieOptions, httpOnly: false });
    return { user: result.user, token: result.token, csrfToken };
  }

  @UseGuards(JwtAuthGuard, CsrfGuard)
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    const secure = process.env.NODE_ENV === 'production' || process.env.COOKIE_SECURE === 'true';
    const sameSite: 'none' | 'lax' = secure ? 'none' : 'lax';
    const cookieOptions = { secure, sameSite, path: '/' };
    res.clearCookie('flotabus_session', cookieOptions);
    res.clearCookie('flotabus_csrf', cookieOptions);
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: Request) { return this.auth.me((req as any).user.id); }
}
