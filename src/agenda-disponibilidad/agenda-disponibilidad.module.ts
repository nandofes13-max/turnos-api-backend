import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgendaDisponibilidad } from './entities/agenda-disponibilidad.entity';
import { AgendaDisponibilidadService } from './agenda-disponibilidad.service';
import { AgendaDisponibilidadController } from './agenda-disponibilidad.controller';
import { ProfesionalCentro } from '../profesional-centro/entities/profesional-centro.entity';
import { AgendaExcepcion } from '../agenda-excepciones/entities/agenda-excepcion.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AgendaDisponibilidad,
      ProfesionalCentro,
      AgendaExcepcion,  // 👈 AGREGADO
    ])
  ],
  controllers: [AgendaDisponibilidadController],
  providers: [AgendaDisponibilidadService],
  exports: [AgendaDisponibilidadService],
})
export class AgendaDisponibilidadModule {}
