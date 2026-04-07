import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgendaDisponibilidad } from './entities/agenda-disponibilidad.entity';
import { AgendaDisponibilidadService } from './agenda-disponibilidad.service';
import { AgendaDisponibilidadController } from './agenda-disponibilidad.controller';
import { ProfesionalCentro } from '../profesional-centro/entities/profesional-centro.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AgendaDisponibilidad, ProfesionalCentro])
  ],
  controllers: [AgendaDisponibilidadController],
  providers: [AgendaDisponibilidadService],
  exports: [AgendaDisponibilidadService],
})
export class AgendaDisponibilidadModule {}
