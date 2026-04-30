import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgendaPublicaController } from './agenda-publica.controller';
import { AgendaPublicaService } from './agenda-publica.service';
// Importamos entidades necesarias
import { ProfesionalCentro } from '../profesional-centro/entities/profesional-centro.entity';
import { Centro } from '../centro/entities/centro.entity';
import { Especialidad } from '../especialidades/entities/especialidad.entity';
import { Profesional } from '../profesional/entities/profesional.entity';
import { AgendaDisponibilidad } from '../agenda-disponibilidad/entities/agenda-disponibilidad.entity';
import { ProfesionalEspecialidad } from '../profesional-especialidad/entities/profesional-especialidad.entity'; // 👈 AGREGAR
// Importamos servicios existentes que vamos a reutilizar
import { AgendaDisponibilidadService } from '../agenda-disponibilidad/agenda-disponibilidad.service';
import { ProfesionalCentroService } from '../profesional-centro/profesional-centro.service';
import { AgendaDisponibilidadModule } from '../agenda-disponibilidad/agenda-disponibilidad.module';
import { ProfesionalCentroModule } from '../profesional-centro/profesional-centro.module';
import { ProfesionalEspecialidadModule } from '../profesional-especialidad/profesional-especialidad.module'; // 👈 AGREGAR

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProfesionalCentro,
      Centro,
      Especialidad,
      Profesional,
      AgendaDisponibilidad,
      ProfesionalEspecialidad, // 👈 AGREGAR
    ]),
    AgendaDisponibilidadModule,
    ProfesionalCentroModule,
    ProfesionalEspecialidadModule, // 👈 AGREGAR PARA QUE NEST RESUELVA EL REPOSITORIO
  ],
  controllers: [AgendaPublicaController],
  providers: [AgendaPublicaService],
  exports: [AgendaPublicaService],
})
export class AgendaPublicaModule {}
