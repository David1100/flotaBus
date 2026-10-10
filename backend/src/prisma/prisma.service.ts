import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

function assertPostgresDatasourceUrl(): void {
  const inheritedProxyVariables = [
    'PRISMA_GENERATE_DATAPROXY',
    'PRISMA_GENERATE_ACCELERATE',
    'PRISMA_ACCELERATE_URL',
  ].filter((name) => {
    const value = process.env[name];
    return value !== undefined && value !== '' && value.toLowerCase() !== 'false';
  });

  if (inheritedProxyVariables.length > 0) {
    throw new Error(
      `Direct PostgreSQL Prisma configuration cannot use inherited Data Proxy/Accelerate variables: ${inheritedProxyVariables.join(', ')}. Unset them and restart the backend.`,
    );
  }

  const engineType = process.env.PRISMA_CLIENT_ENGINE_TYPE;
  if (engineType && engineType !== 'library' && engineType !== 'binary') {
    throw new Error(
      'PRISMA_CLIENT_ENGINE_TYPE must be library or binary for direct PostgreSQL.',
    );
  }

  const value = process.env.DATABASE_URL;
  if (!value) {
    throw new Error('DATABASE_URL is required for the PostgreSQL Prisma client.');
  }

  let protocol: string;
  try {
    protocol = new URL(value).protocol;
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL URL.');
  }

  if (protocol !== 'postgresql:' && protocol !== 'postgres:') {
    throw new Error(
      'DATABASE_URL must use postgresql:// or postgres://; Accelerate/Data Proxy is not enabled.',
    );
  }
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    assertPostgresDatasourceUrl();
    super();
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
