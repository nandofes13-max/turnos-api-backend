import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgendaExcepcion } from './entities/agenda-excepcion.entity';
import { AgendaExcepcionesService } from './agenda-excepciones.service';
import { AgendaExcepcionesController } from './agenda-excepciones.controller';
import { AgendaDisponibilidad } from '../agenda-disponibilidad/entities/agenda-disponibilidad.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AgendaExcepcion, AgendaDisponibilidad])
  ],
  controllers: [AgendaExcepcionesController],
  providers: [AgendaExcepcionesService],
  exports: [AgendaExcepcionesService],
})
export class AgendaExcepcionesModule {}
