import { ForbiddenException } from '@nestjs/common';
import { CsrfGuard } from './csrf.guard';

describe('CsrfGuard', () => {
  const guard = new CsrfGuard();
  const context = (request: any) => ({ switchToHttp: () => ({ getRequest: () => request }) }) as any;

  it('allows validated bearer requests without relying on ambient cookies', () => {
    expect(guard.canActivate(context({ method: 'POST', authMethod: 'bearer', cookies: {}, headers: {} }))).toBe(true);
  });

  it('requires matching CSRF cookie and header for cookie requests', () => {
    expect(guard.canActivate(context({ method: 'POST', authMethod: 'cookie', cookies: { flotabus_csrf: 'csrf' }, headers: { 'x-csrf-token': 'csrf' } }))).toBe(true);
    expect(() => guard.canActivate(context({ method: 'POST', authMethod: 'cookie', cookies: { flotabus_csrf: 'csrf' }, headers: {} }))).toThrow(ForbiddenException);
  });
});
