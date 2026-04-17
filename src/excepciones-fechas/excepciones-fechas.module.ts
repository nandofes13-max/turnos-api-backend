// src/excepciones-fechas/excepciones-fechas.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExcepcionFecha } from './entities/excepcion-fecha.entity';
import { ExcepcionesFechasService } from './excepciones-fechas.service';
import { ExcepcionesFechasController } from './excepciones-fechas.controller';
import { ProfesionalCentroModule } from '../profesional-centro/profesional-centro.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ExcepcionFecha]),
    ProfesionalCentroModule, // 👈 Importar el módulo completo
  ],
  controllers: [ExcepcionesFechasController],
  providers: [ExcepcionesFechasService],
  exports: [ExcepcionesFechasService],
})
export class ExcepcionesFechasModule {}
