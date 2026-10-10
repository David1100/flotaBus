const DEFAULT_DEVELOPMENT_ORIGIN = 'http://localhost:4321';
const CORS_METHODS = ['OPTIONS', 'GET', 'POST', 'PATCH', 'PUT', 'DELETE'];
const CORS_HEADERS = ['Content-Type', 'Authorization', 'X-CSRF-Token', 'CSRF'];

function parseConfiguredOrigins(value: string): string[] {
  const origins = value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    throw new Error('CORS_ORIGIN must contain at least one explicit origin.');
  }

  for (const origin of origins) {
    if (origin === '*' || origin.includes('*')) {
      throw new Error('CORS_ORIGIN cannot contain wildcards when credentials are enabled.');
    }

    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error(`Invalid CORS_ORIGIN value: "${origin}". Use an exact origin such as https://flota-bus.vercel.app.`);
    }

    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== origin) {
      throw new Error(`Invalid CORS_ORIGIN value: "${origin}". Use an exact origin without a path or trailing slash.`);
    }
  }

  return [...new Set(origins)];
}

export function corsOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  const configured = env.CORS_ORIGIN?.trim();

  if (!configured) {
    if (env.NODE_ENV === 'production') {
      throw new Error('CORS_ORIGIN is required in production. Set it to https://flota-bus.vercel.app (without a trailing slash), or an explicit comma-separated list of trusted HTTPS origins.');
    }
    return [DEFAULT_DEVELOPMENT_ORIGIN];
  }

  const origins = parseConfiguredOrigins(configured);
  if (env.NODE_ENV === 'production' && origins.some((origin) => !origin.startsWith('https://'))) {
    throw new Error('Production CORS_ORIGIN values must use HTTPS.');
  }
  return origins;
}

export function corsOptions(env: NodeJS.ProcessEnv = process.env) {
  return {
    origin: corsOrigins(env),
    credentials: true,
    methods: CORS_METHODS,
    allowedHeaders: CORS_HEADERS,
    optionsSuccessStatus: 204,
  };
}
