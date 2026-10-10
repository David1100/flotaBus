import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import express from 'express';
import { AppModule } from './app.module';
import { SafeExceptionFilter } from './common/http-exception.filter';

function corsOrigins(): string[] {
  const configured = process.env.CORS_ORIGIN
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const origins = configured?.length ? configured : ['http://localhost:4321'];

  if (origins.includes('*')) {
    throw new Error('CORS_ORIGIN cannot contain * when credentials are enabled.');
  }
  if (process.env.NODE_ENV === 'production' && origins.some((origin) => !origin.startsWith('https://'))) {
    throw new Error('Production CORS_ORIGIN values must use HTTPS.');
  }
  return origins;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.use(helmet());
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '20kb' }));
  app.use(cookieParser());
  app.use((req: any, res: any, next: any) => {
    req.id = req.headers['x-request-id'] || randomUUID();
    res.setHeader('x-request-id', req.id);
    next();
  });
  app.enableCors({ origin: corsOrigins(), credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new SafeExceptionFilter());
  await app.listen(Number(process.env.PORT || 3000), '0.0.0.0');
}

void bootstrap();
