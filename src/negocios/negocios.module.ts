// src/negocios/negocios.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Negocio } from './entities/negocio.entity';
import { NegociosService } from './negocios.service';
import { NegociosController } from './negocios.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Negocio])],
  providers: [NegociosService],
  controllers: [NegociosController],
})
export class NegociosModule {}
