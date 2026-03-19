// src/actividades/actividad.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Actividad } from './entities/actividad.entity';
import { ActividadService } from './actividad.service';
import { ActividadController } from './actividad.controller';
import { Negocio } from '../negocios/entities/negocio.entity'; // 👈 IMPORTAR

@Module({
  imports: [
    TypeOrmModule.forFeature([Actividad, Negocio]), // 👈 AGREGAR Negocio
  ],
  providers: [ActividadService],
  controllers: [ActividadController],
})
export class ActividadModule {}
