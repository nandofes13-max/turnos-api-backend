import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { config } from 'dotenv';
config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 🔓 Habilitar CORS para permitir peticiones desde el frontend
  app.enableCors({
    origin: 'https://turnos-pwa-frontend.onrender.com', // URL de tu frontend en Render
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
}
bootstrap();
