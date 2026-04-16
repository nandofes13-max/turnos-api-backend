import { PartialType } from '@nestjs/mapped-types';
import { CreateExcepcionRecurrenteDto } from './create-excepcion-recurrente.dto';

export class UpdateExcepcionRecurrenteDto extends PartialType(CreateExcepcionRecurrenteDto) {}
