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
    'http://localhost:5173',
    'https://zibooka.onrender.com',
    'https://zibooka-frontend.onrender.com',
    process.env.VITE_FRONTEND_URL,
  ].filter(Boolean);

  console.log('Allowed Origins:', allowedOrigins);

  // Configurar CORS
  app.enableCors({
    origin: (origin, callback) => {
      // Permitir requests sin origin (como proxies de Render)
      if (!origin) {
        console.log('No origin header - allowing (likely from Render proxy)');
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        console.log('Origin allowed:', origin);
        callback(null, true);
      } else {
        console.log('Origin not in whitelist but allowing:', origin);
        // Permitir de todas formas para compatibilidad con proxy
        callback(null, true);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
    exposedHeaders: ['Set-Cookie'],
  });

  // Middleware para cookies
  app.use(cookieParser());

  // Middleware de debugging
  app.use((req, res, next) => {
    console.log('Request:', req.method, req.path);
    console.log('Headers:', req.headers.authorization ? 'Auth header presente' : 'No auth header');
    console.log('Cookies:', Object.keys(req.cookies).length > 0 ? 'Cookies presentes' : 'No cookies');
    next();
  });

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
  console.log(`Environment: ${process.env.APP_ENV}`);
  console.log(`Swagger docs available at http://localhost:${port}/api/docs`);
  console.log(`Stripe webhook endpoint: http://localhost:${port}/api/stripe`);

}
bootstrap();
