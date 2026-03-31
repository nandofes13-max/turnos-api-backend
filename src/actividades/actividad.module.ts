// src/actividades/actividad.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Actividad } from './entities/actividad.entity';
import { ActividadService } from './actividad.service';
import { ActividadController } from './actividad.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Actividad])],
  providers: [ActividadService],
  controllers: [ActividadController],
})
export class ActividadModule {}
