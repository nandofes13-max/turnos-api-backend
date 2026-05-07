import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfesionalCentro } from './entities/profesional-centro.entity';
import { ProfesionalCentroService } from './profesional-centro.service';
import { ProfesionalCentroController } from './profesional-centro.controller';
import { Profesional } from '../profesional/entities/profesional.entity';
import { Especialidad } from '../especialidades/entities/especialidad.entity';
import { Centro } from '../centro/entities/centro.entity';
import { ActividadEspecialidad } from '../actividad-especialidad/entities/actividad-especialidad.entity';
import { NegocioActividad } from '../negocio-actividades/entities/negocio-actividad.entity';
import { CentroModule } from '../centro/centro.module';
import { AgendaDisponibilidadModule } from '../agenda-disponibilidad/agenda-disponibilidad.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProfesionalCentro, 
      Profesional, 
      Especialidad, 
      Centro,
      ActividadEspecialidad,
      NegocioActividad
    ]),
    forwardRef(() => CentroModule),
    forwardRef(() => AgendaDisponibilidadModule),  // 👈 AGREGAR
  ],
  controllers: [ProfesionalCentroController],
  providers: [ProfesionalCentroService],
  exports: [ProfesionalCentroService],
})
export class ProfesionalCentroModule {}
