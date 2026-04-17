// src/excepciones-fechas/excepciones-fechas.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExcepcionFecha } from './entities/excepcion-fecha.entity';
import { ExcepcionesFechasService } from './excepciones-fechas.service';
import { ExcepcionesFechasController } from './excepciones-fechas.controller';
import { ProfesionalCentro } from '../profesional-centro/entities/profesional-centro.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ExcepcionFecha, ProfesionalCentro])
  ],
  controllers: [ExcepcionesFechasController],
  providers: [ExcepcionesFechasService],
  exports: [ExcepcionesFechasService],
})
export class ExcepcionesFechasModule {}
