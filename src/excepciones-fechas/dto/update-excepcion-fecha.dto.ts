import { PartialType } from '@nestjs/mapped-types';
import { CreateExcepcionFechaDto } from './create-excepcion-fecha.dto';
import { IsOptional, IsNumber } from 'class-validator';

export class UpdateExcepcionFechaDto extends PartialType(CreateExcepcionFechaDto) {
  @IsOptional()
  @IsNumber({}, { message: 'id debe ser un número' })
  id?: number;
}
