import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  // Enable global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Permitir múltiples origenes
  const allowedOrigins = [
    process.env.VITE_FRONTEND_URL || 'http://localhost:5173',
    'https://tu-app-frontend.onrender.com',
  ]; // URL del Frontend

  // Configurar CORS
  app.enableCors({
    origin: (origin, callback) => {
      // Permitir requests sin origin (mobile apps, curl, postman)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  });

  // Middleware para cookies
  app.use(cookieParser());

  // Set global prefix
  app.setGlobalPrefix('api');

  // Configuración de Swagger
  const config = new DocumentBuilder()
    .setTitle('Zibooka API')
    .setDescription('API documentation')
    .setVersion('1.0')
    .addTag('Backend')
    .addBearerAuth() // Para autenticación con JWT
    .addCookieAuth('token') // Para autenticación con cookies
    .addCookieAuth('adminToken') // Para autenticación admin
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Puerto del servidor
  const port = process.env.PORT || 4000;

  await app.listen(port);
  console.log(`Server is running on http://localhost:${port}`);
  console.log(`Swagger docs available at http://localhost:${port}/api/docs`);
  console.log(`Stripe webhook endpoint: http://localhost:${port}/api/stripe`);
}
bootstrap();
