import { UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './auth.guard';

describe('JwtAuthGuard', () => {
  const user = { id: 7, username: 'admin', rol: 'ADMINISTRADOR', isActive: true };
  const db = { user: { findUnique: jest.fn().mockResolvedValue(user) } } as any;
  const jwt = { verifyAsync: jest.fn().mockResolvedValue({ sub: user.id }) } as any;
  const guard = new JwtAuthGuard(jwt, db);
  const context = (request: any) => ({ switchToHttp: () => ({ getRequest: () => request }) }) as any;

  it('prefers a bearer token and marks the request as explicit authentication', async () => {
    const request: any = { headers: { authorization: 'Bearer mobile-token' }, cookies: { flotabus_session: 'cookie-token' } };

    await expect(guard.canActivate(context(request))).resolves.toBe(true);
    expect(jwt.verifyAsync).toHaveBeenCalledWith('mobile-token');
    expect(request.authMethod).toBe('bearer');
  });

  it('continues to authenticate with the session cookie', async () => {
    const request: any = { headers: {}, cookies: { flotabus_session: 'cookie-token' } };

    await expect(guard.canActivate(context(request))).resolves.toBe(true);
    expect(jwt.verifyAsync).toHaveBeenCalledWith('cookie-token');
    expect(request.authMethod).toBe('cookie');
  });

  it('rejects requests without either credential', async () => {
    await expect(guard.canActivate(context({ headers: {}, cookies: {} }))).rejects.toThrow(UnauthorizedException);
  });
});
