import { PartialType } from '@nestjs/mapped-types';
import { CreateProfesionalCentroDto } from './create-profesional-centro.dto';
import { IsOptional, IsDate, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProfesionalCentroDto extends PartialType(CreateProfesionalCentroDto) {
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  fecha_baja?: Date | null;

  @IsOptional()
  @IsString()
  usuario_baja?: string | null;
}
