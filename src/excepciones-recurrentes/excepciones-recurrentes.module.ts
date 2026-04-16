import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExcepcionRecurrente } from './entities/excepcion-recurrente.entity';
import { ExcepcionesRecurrentesService } from './excepciones-recurrentes.service';
import { ExcepcionesRecurrentesController } from './excepciones-recurrentes.controller';
import { AgendaDisponibilidad } from '../agenda-disponibilidad/entities/agenda-disponibilidad.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ExcepcionRecurrente, AgendaDisponibilidad])
  ],
  controllers: [ExcepcionesRecurrentesController],
  providers: [ExcepcionesRecurrentesService],
  exports: [ExcepcionesRecurrentesService],
})
export class ExcepcionesRecurrentesModule {}
