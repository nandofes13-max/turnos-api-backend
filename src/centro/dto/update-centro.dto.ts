import { PartialType } from '@nestjs/mapped-types';
import { CreateCentroDto } from './create-centro.dto';
import { IsOptional, IsString, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCentroDto extends PartialType(CreateCentroDto) {
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  fecha_baja?: Date | null;

  @IsOptional()
  @IsString()
  usuario_baja?: string | null;
}
