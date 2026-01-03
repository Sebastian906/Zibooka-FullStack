import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Permitir múltiples origenes
  const allowedOrigins = ['http://localhost:5173']; // URL del Frontend

  // Configurar CORS
  app.enableCors({
    origin: allowedOrigins, 
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
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Puerto del servidor
  const port = process.env.PORT || 4000;

  await app.listen(port);
  console.log(`Server is running on http://localhost:${port}`);
  console.log(`Swagger docs available at http://localhost:${port}/api/docs`);
}
bootstrap();
