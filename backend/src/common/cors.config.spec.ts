import { corsOptions, corsOrigins } from './cors.config';

describe('CORS configuration', () => {
  it('requires an explicit origin in production', () => {
    expect(() => corsOrigins({ NODE_ENV: 'production' })).toThrow('CORS_ORIGIN is required in production');
  });

  it('accepts exact comma-separated origins without wildcard support', () => {
    expect(corsOrigins({
      NODE_ENV: 'production',
      CORS_ORIGIN: 'https://flota-bus.vercel.app, https://fleet.example.com',
    })).toEqual(['https://flota-bus.vercel.app', 'https://fleet.example.com']);
    expect(() => corsOrigins({ NODE_ENV: 'production', CORS_ORIGIN: '*' })).toThrow('wildcards');
    expect(() => corsOrigins({ NODE_ENV: 'production', CORS_ORIGIN: 'https://flota-bus.vercel.app/' })).toThrow('trailing slash');
  });

  it('configures credentialed preflight methods and CSRF headers', () => {
    expect(corsOptions({ NODE_ENV: 'production', CORS_ORIGIN: 'https://flota-bus.vercel.app' })).toMatchObject({
      origin: ['https://flota-bus.vercel.app'],
      credentials: true,
      methods: ['OPTIONS', 'GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'CSRF'],
    });
  });
});
