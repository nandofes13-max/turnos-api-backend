import { PartialType } from '@nestjs/mapped-types';
import { CreateExcepcionRecurrenteDto } from './create-excepcion-recurrente.dto';
import { IsOptional, IsNumber } from 'class-validator';

export class UpdateExcepcionRecurrenteDto extends PartialType(CreateExcepcionRecurrenteDto) {
  @IsOptional()
  @IsNumber({}, { message: 'id debe ser un número' })
  id?: number;
}
