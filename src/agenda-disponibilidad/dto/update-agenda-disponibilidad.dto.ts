import { PartialType } from '@nestjs/mapped-types';
import { CreateAgendaDisponibilidadDto } from './create-agenda-disponibilidad.dto';

export class UpdateAgendaDisponibilidadDto extends PartialType(CreateAgendaDisponibilidadDto) {}
