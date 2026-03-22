// src/actividad-especialidad/dto/update-actividad-especialidad.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateActividadEspecialidadDto } from './create-actividad-especialidad.dto';

export class UpdateActividadEspecialidadDto extends PartialType(CreateActividadEspecialidadDto) {}
