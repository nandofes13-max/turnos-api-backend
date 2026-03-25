import { PartialType } from '@nestjs/mapped-types';
import { CreateProfesionalEspecialidadDto } from './create-profesional-especialidad.dto';

export class UpdateProfesionalEspecialidadDto extends PartialType(CreateProfesionalEspecialidadDto) {}
