// src/actividad-especialidad/actividad-especialidad.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActividadEspecialidad } from './entities/actividad-especialidad.entity';
import { Actividad } from '../actividades/entities/actividad.entity';
import { Especialidad } from '../especialidades/entities/especialidad.entity';
import { ActividadEspecialidadService } from './actividad-especialidad.service';
import { ActividadEspecialidadController } from './actividad-especialidad.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ActividadEspecialidad, Actividad, Especialidad])],
  providers: [ActividadEspecialidadService],
  controllers: [ActividadEspecialidadController],
})
export class ActividadEspecialidadModule {}
