import { PartialType } from '@nestjs/mapped-types';
import { CreateNegocioDto } from './create-negocio.dto';
import { IsOptional, IsDate, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateNegocioDto extends PartialType(CreateNegocioDto) {
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  fecha_baja?: Date | null;

  @IsOptional()
  @IsString()
  usuario_baja?: string | null;
}
