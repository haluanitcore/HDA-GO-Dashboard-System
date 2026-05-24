import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix: all routes start with /api
  app.setGlobalPrefix('api');

  // Enable CORS for frontend — reads from env or defaults to localhost:3000
  const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
    .replace(/"/g, '') // Strip quotes if any
    .replace(/'/g, '') // Strip single quotes if any
    .split(',')
    .map((o) => o.trim());

  app.enableCors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type,Authorization',
  });

  // Global validation pipe (auto-validates DTOs)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 4000);
  console.log(`
  ╔══════════════════════════════════════════════════╗
  ║     🚀 HDA Go Backend API — Running!            ║
  ║     📍 http://localhost:${process.env.PORT ?? 4000}/api            ║
  ║     🔐 Auth:  POST /api/auth/login               ║
  ║     🔐 Auth:  POST /api/auth/register             ║
  ║     👤 Creator: GET /api/creators/dashboard       ║
  ║     📦 Campaigns: GET /api/campaigns              ║
  ║     📊 Analytics: GET /api/analytics/kpi          ║
  ╚══════════════════════════════════════════════════╝
  `);
}
bootstrap();
