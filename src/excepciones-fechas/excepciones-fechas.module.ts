import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExcepcionFecha } from './entities/excepcion-fecha.entity';
import { ExcepcionesFechasService } from './excepciones-fechas.service';
import { ExcepcionesFechasController } from './excepciones-fechas.controller';
import { AgendaDisponibilidad } from '../agenda-disponibilidad/entities/agenda-disponibilidad.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ExcepcionFecha, AgendaDisponibilidad])
  ],
  controllers: [ExcepcionesFechasController],
  providers: [ExcepcionesFechasService],
  exports: [ExcepcionesFechasService],
})
export class ExcepcionesFechasModule {}
