import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configurar CORS
  app.enableCors({
    origin: 'http://localhost:5173', // URL del Frontend
    credentials: true,
  });

  // Middleware para cookies
  app.use(cookieParser());

  // Puerto del servidor
  const port = process.env.PORT || 4000;

  await app.listen(port);
  console.log(`Server is running on http://localhost:${port}`);
}
bootstrap();
