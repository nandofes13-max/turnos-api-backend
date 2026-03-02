// src/app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL, // URL de Supabase guardada como variable de entorno en Render
      ssl: {
        rejectUnauthorized: false, // necesario porque Supabase pooler usa certificado autofirmado
      },
      extra: {
        family: 4, // fuerza IPv4, evita errores ENETUNREACH en Render
      },
      autoLoadEntities: true, // carga automáticamente las entidades de tu proyecto
      synchronize: true,     // 🔹 en producción no conviene sincronizar schema automáticamente
    }),
  ],
})
export class AppModule {}
