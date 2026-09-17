import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import * as path from 'path';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/exceptions/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  try {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
      logger: ['log', 'error', 'warn', 'debug'],
    });

    // --- Security headers via Helmet ---
    app.use(helmet());

    // Enable CORS - accept the configured frontend origin(s) plus any *.seenode.app origin.
    // FRONTEND_URL accepts a comma-separated list, e.g. "https://torox.com.ar,https://www.torox.com.ar".
    const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3001')
      .split(',')
      .map((value) => value.trim().replace(/\/+$/, ''))
      .filter(Boolean);
    app.enableCors({
      origin: (origin, callback) => {
        if (!origin || origin.endsWith('.com.ar') || allowedOrigins.includes(origin.replace(/\/+$/, ''))) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });

    app.useStaticAssets(path.resolve(process.cwd(), 'uploads'), { prefix: '/uploads' });

    app.setGlobalPrefix('api');

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );

    app.useGlobalFilters(new HttpExceptionFilter());
    // ClassSerializerInterceptor must wrap TransformInterceptor so that @Exclude()
    // (e.g. User.password, the reset-code fields) is applied to the final payload.
    // Without it @Exclude() is a no-op and the password hash leaks from /auth/me
    // and /users.
    app.useGlobalInterceptors(
      new ClassSerializerInterceptor(app.get(Reflector)),
      new TransformInterceptor(),
    );

    const port = process.env.PORT || 3000;
    await app.listen(port);
    logger.log(`🚀 TOROX API running on http://localhost:${port}/api`);
  } catch (error: unknown) {
    logger.error('Failed to start application', (error as Error).stack);
    process.exit(1);
  }
}

bootstrap();
