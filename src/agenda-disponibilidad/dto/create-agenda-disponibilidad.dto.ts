import { IsNumber, IsNotEmpty, IsString, IsOptional, IsDate, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAgendaDisponibilidadDto {
  @IsNumber({}, { message: 'El ID del profesional-centro debe ser un número' })
  @IsNotEmpty({ message: 'El ID del profesional-centro es obligatorio' })
  profesionalCentroId: number;

  @IsNumber({}, { message: 'El día de la semana debe ser un número' })
  @IsNotEmpty({ message: 'El día de la semana es obligatorio' })
  @Min(0, { message: 'El día debe estar entre 0 (Domingo) y 6 (Sábado)' })
  @Max(6, { message: 'El día debe estar entre 0 (Domingo) y 6 (Sábado)' })
  diaSemana: number;

  @IsString({ message: 'La hora desde debe ser un texto' })
  @IsNotEmpty({ message: 'La hora desde es obligatoria' })
  horaDesde: string;

  @IsString({ message: 'La hora hasta debe ser un texto' })
  @IsNotEmpty({ message: 'La hora hasta es obligatoria' })
  horaHasta: string;

  @IsNumber({}, { message: 'La duración del turno debe ser un número' })
  @IsNotEmpty({ message: 'La duración del turno es obligatoria' })
  @Min(1, { message: 'La duración del turno debe ser mayor a 0' })
  duracionTurno: number;

  @IsNumber({}, { message: 'El buffer debe ser un número' })
  @IsOptional()
  @Min(0, { message: 'El buffer no puede ser negativo' })
  bufferMinutos?: number;

  @IsDate({ message: 'La fecha desde debe ser una fecha válida' })
  @IsNotEmpty({ message: 'La fecha desde es obligatoria' })
  @Type(() => Date)
  fechaDesde: Date;

  @IsDate({ message: 'La fecha hasta debe ser una fecha válida' })
  @IsOptional()
  @Type(() => Date)
  fechaHasta?: Date | null;
}
