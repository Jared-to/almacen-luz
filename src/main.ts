import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express'; // Importa el tipo correcto
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule); // Declara el tipo explícito

  // Servir archivos estáticos
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads', // Prefijo para las URLs
  });

  app.setGlobalPrefix('almacen-candelaria/api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    })
  );
  // Habilitar CORS
  app.enableCors({
    // origin: 'http://localhost:5173', // Permite solo este origen
    // methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    // credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
