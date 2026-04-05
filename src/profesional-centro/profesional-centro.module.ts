import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfesionalCentro } from './entities/profesional-centro.entity';
import { ProfesionalCentroService } from './profesional-centro.service';
import { ProfesionalCentroController } from './profesional-centro.controller';
import { Profesional } from '../profesional/entities/profesional.entity';
import { Especialidad } from '../especialidades/entities/especialidad.entity';
import { Centro } from '../centro/entities/centro.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProfesionalCentro, Profesional, Especialidad, Centro])
  ],
  controllers: [ProfesionalCentroController],
  providers: [ProfesionalCentroService],
  exports: [ProfesionalCentroService],
})
export class ProfesionalCentroModule {}
