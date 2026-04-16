import { PartialType } from '@nestjs/mapped-types';
import { CreateExcepcionFechaDto } from './create-excepcion-fecha.dto';

export class UpdateExcepcionFechaDto extends PartialType(CreateExcepcionFechaDto) {}
