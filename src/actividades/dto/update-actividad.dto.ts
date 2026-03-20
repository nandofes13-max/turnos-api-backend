// src/actividades/dto/update-actividad.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateActividadDto } from './create-actividad.dto';
import { IsOptional, IsDate, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateActividadDto extends PartialType(CreateActividadDto) {
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  fecha_baja?: Date | null;

  @IsOptional()
  @IsString()
  usuario_baja?: string | null;
}
