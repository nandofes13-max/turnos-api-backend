import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
      extra: {
        family: 4, // 👈 ESTO SOLUCIONA ENETUNREACH
      },
      autoLoadEntities: true,
      synchronize: false,
    }),
  ],
})
export class AppModule {}
