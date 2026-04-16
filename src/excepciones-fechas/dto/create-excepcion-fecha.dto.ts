import { IsNotEmpty, IsOptional, IsDateString, IsString, MaxLength, IsIn, IsNumber } from 'class-validator';

export class CreateExcepcionFechaDto {
  @IsNotEmpty({ message: 'El agendaDisponibilidadId es obligatorio' })
  @IsNumber({}, { message: 'agendaDisponibilidadId debe ser un número' })
  agendaDisponibilidadId: number;

  @IsNotEmpty({ message: 'La fecha desde es obligatoria' })
  @IsDateString({}, { message: 'fechaDesde debe ser una fecha válida (YYYY-MM-DD)' })
  fechaDesde: Date;

  @IsOptional()
  @IsDateString({}, { message: 'fechaHasta debe ser una fecha válida (YYYY-MM-DD)' })
  fechaHasta?: Date | null;

  @IsOptional()
  @IsString({ message: 'horaDesde debe ser una hora válida' })
  horaDesde?: string | null;

  @IsOptional()
  @IsString({ message: 'horaHasta debe ser una hora válida' })
  horaHasta?: string | null;

  @IsNotEmpty({ message: 'El tipo es obligatorio' })
  @IsIn(['deshabilitado', 'bloqueado'], { message: 'tipo debe ser "deshabilitado" o "bloqueado"' })
  tipo: string;

  @IsOptional()
  @IsString({ message: 'motivo debe ser texto' })
  @MaxLength(500, { message: 'motivo no puede superar los 500 caracteres' })
  motivo?: string | null;
}
