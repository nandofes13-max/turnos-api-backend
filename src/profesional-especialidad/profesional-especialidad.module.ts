import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfesionalEspecialidad } from './entities/profesional-especialidad.entity';
import { ProfesionalEspecialidadService } from './profesional-especialidad.service';
import { ProfesionalEspecialidadController } from './profesional-especialidad.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ProfesionalEspecialidad])],
  controllers: [ProfesionalEspecialidadController],
  providers: [ProfesionalEspecialidadService],
  exports: [ProfesionalEspecialidadService],
})
export class ProfesionalEspecialidadModule {}
