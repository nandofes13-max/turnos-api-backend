import { PartialType } from '@nestjs/mapped-types';
import { CreateAgendaExcepcionDto } from './create-agenda-excepcion.dto';

export class UpdateAgendaExcepcionDto extends PartialType(CreateAgendaExcepcionDto) {}
