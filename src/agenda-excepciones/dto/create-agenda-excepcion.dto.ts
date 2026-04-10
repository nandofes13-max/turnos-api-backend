import { IsNumber, IsNotEmpty, IsString, IsOptional, IsDate, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAgendaExcepcionDto {
  @IsNumber({}, { message: 'El ID de la agenda es obligatorio' })
  @IsNotEmpty({ message: 'El ID de la agenda es obligatorio' })
  agendaDisponibilidadId: number;

  @IsDate({ message: 'La fecha debe ser una fecha válida' })
  @IsNotEmpty({ message: 'La fecha es obligatoria' })
  @Type(() => Date)
  fecha: Date;

  @IsString({ message: 'La hora debe ser un texto' })
  @IsNotEmpty({ message: 'La hora es obligatoria' })
  hora: string;

  @IsString({ message: 'El tipo debe ser texto' })
  @IsNotEmpty({ message: 'El tipo es obligatorio' })
  @IsIn(['deshabilitado', 'habilitado_extra'], { message: 'Tipo debe ser "deshabilitado" o "habilitado_extra"' })
  tipo: string;

  @IsString({ message: 'El motivo debe ser texto' })
  @IsOptional()
  motivo?: string | null;
}
