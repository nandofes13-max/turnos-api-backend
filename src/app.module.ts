import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FilialModule } from './filial/filial.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    // ConfigModule carga las variables de entorno
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    
    // TypeORM configurado para Postgres + SSL
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: true, // SOLO en desarrollo
      ssl: {
        rejectUnauthorized: false, // permite conectar con Render sin certificado local
      },
    }),

    // Tus módulos
    FilialModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
