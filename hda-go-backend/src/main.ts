import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix: all routes start with /api
  app.setGlobalPrefix('api');

  // Enable CORS for frontend (Next.js on port 3000)
  app.enableCors({
    origin: ['http://localhost:3000'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
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
