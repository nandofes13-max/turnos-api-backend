// src/app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FilialModule } from './filial/filial.module';

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
      entities: [__dirname + '/**/*.entity{.ts,.js}'], // 🔹 ruta correcta para dev y prod
      autoLoadEntities: true,
      synchronize: true, // 🔹 solo para demo
    }),
    FilialModule, // 🔹 asegúrate de importar tu módulo
  ],
})
export class AppModule {}
