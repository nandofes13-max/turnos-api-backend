// src/negocio-actividades/dto/update-negocio-actividad.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateNegocioActividadDto } from './create-negocio-actividad.dto';

export class UpdateNegocioActividadDto extends PartialType(CreateNegocioActividadDto) {}
