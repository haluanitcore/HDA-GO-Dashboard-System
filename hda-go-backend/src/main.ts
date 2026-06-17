import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Trust proxy for express-rate-limit behind Nginx reverse proxy
  app.set('trust proxy', 1);
  const logger = new Logger('Bootstrap');

  // Validate critical env variables loaded via ConfigModule
  if (!process.env.JWT_SECRET) {
    throw new Error('FATAL: JWT_SECRET environment variable is missing!');
  }
  if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error(
      'FATAL: JWT_REFRESH_SECRET environment variable is missing!',
    );
  }

  // Global prefix: all routes start with /api
  app.setGlobalPrefix('api');

  app.use(cookieParser());

  // Enable helmet for security headers (disable crossOriginResourcePolicy to allow local files rendering)
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));

  // Apply global rate limiting to all endpoints (500 requests per 15 minutes)
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 500, // limit each IP to 500 requests per windowMs
      message: {
        message:
          'Batas permintaan terlampaui. Silakan coba lagi setelah beberapa saat.',
      },
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  // Apply strict rate limiting specifically to /api/auth/* endpoints
  app.use(
    '/api/auth',
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: {
        message:
          'Terlalu banyak permintaan dari IP ini, silakan coba lagi setelah 15 menit.',
      },
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

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

  const port = process.env.PORT ?? 4000;
  await app.listen(port);

  logger.log(`HDA Go Backend API — Running on http://localhost:${port}/api`);
}
void bootstrap();
