// src/agenda-disponibilidad/agenda-disponibilidad.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgendaDisponibilidad } from './entities/agenda-disponibilidad.entity';
import { AgendaDisponibilidadService } from './agenda-disponibilidad.service';
import { AgendaDisponibilidadController } from './agenda-disponibilidad.controller';
import { ProfesionalCentro } from '../profesional-centro/entities/profesional-centro.entity';
import { Centro } from '../centro/entities/centro.entity';
import { ExcepcionFecha } from '../excepciones-fechas/entities/excepcion-fecha.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AgendaDisponibilidad,
      ProfesionalCentro,
      Centro,
      ExcepcionFecha,
    ])
  ],
  controllers: [AgendaDisponibilidadController],
  providers: [AgendaDisponibilidadService],
  exports: [AgendaDisponibilidadService],
})
export class AgendaDisponibilidadModule {}
