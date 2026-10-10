import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import express from 'express';
import { AppModule } from './app.module';
import { SafeExceptionFilter } from './common/http-exception.filter';
import { corsOptions } from './common/cors.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  // Register CORS before any other middleware so OPTIONS is answered before guards.
  app.enableCors(corsOptions());
  app.use(helmet());
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '20kb' }));
  app.use(cookieParser());
  app.use((req: any, res: any, next: any) => {
    req.id = req.headers['x-request-id'] || randomUUID();
    res.setHeader('x-request-id', req.id);
    next();
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new SafeExceptionFilter());
  await app.listen(Number(process.env.PORT || 3000), '0.0.0.0');
}

void bootstrap();
