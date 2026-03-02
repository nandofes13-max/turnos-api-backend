import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FilialModule } from './filial/filial.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,

      autoLoadEntities: true,
      synchronize: true,

      // 🔎 ACTIVAMOS LOGS PARA VER QUÉ PASA
      logging: true,

      // 🔁 Reintentos de conexión (útil en Render)
      retryAttempts: 5,
      retryDelay: 3000,

      // 🔐 Configuración SSL robusta para Supabase
      ssl: {
        rejectUnauthorized: false,
      },
      extra: {
        ssl: {
          rejectUnauthorized: false,
        },
      },
    }),

    FilialModule,
  ],
})
export class AppModule {}
