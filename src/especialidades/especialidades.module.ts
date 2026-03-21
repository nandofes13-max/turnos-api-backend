// src/especialidades/especialidades.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Especialidad } from './entities/especialidad.entity';
import { Actividad } from '../actividades/entities/actividad.entity';
import { EspecialidadesService } from './especialidades.service';
import { EspecialidadesController } from './especialidades.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Especialidad, Actividad])],
  providers: [EspecialidadesService],
  controllers: [EspecialidadesController],
})
export class EspecialidadesModule {}
