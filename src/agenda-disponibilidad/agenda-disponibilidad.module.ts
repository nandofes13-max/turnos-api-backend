// src/agenda-disponibilidad/agenda-disponibilidad.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgendaDisponibilidad } from './entities/agenda-disponibilidad.entity';
import { AgendaDisponibilidadService } from './agenda-disponibilidad.service';
import { AgendaDisponibilidadController } from './agenda-disponibilidad.controller';
import { ProfesionalCentro } from '../profesional-centro/entities/profesional-centro.entity';
import { ExcepcionRecurrente } from '../excepciones-recurrentes/entities/excepcion-recurrente.entity';
import { ExcepcionFecha } from '../excepciones-fechas/entities/excepcion-fecha.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AgendaDisponibilidad,
      ProfesionalCentro,
      ExcepcionRecurrente,  // 👈 AGREGAR
      ExcepcionFecha,       // 👈 AGREGAR
    ])
  ],
  controllers: [AgendaDisponibilidadController],
  providers: [AgendaDisponibilidadService],
  exports: [AgendaDisponibilidadService],
})
export class AgendaDisponibilidadModule {}
