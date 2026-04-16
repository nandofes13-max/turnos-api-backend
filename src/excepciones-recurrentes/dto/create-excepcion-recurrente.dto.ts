import { IsNumber, IsNotEmpty, IsString, IsOptional, IsIn, Min, Max } from 'class-validator';

export class CreateExcepcionRecurrenteDto {
  @IsNumber({}, { message: 'El ID de la agenda es obligatorio' })
  @IsNotEmpty({ message: 'El ID de la agenda es obligatorio' })
  agendaDisponibilidadId: number;

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

  @IsString({ message: 'El tipo debe ser texto' })
  @IsNotEmpty({ message: 'El tipo es obligatorio' })
  @IsIn(['deshabilitado', 'habilitado_extra'], { message: 'Tipo debe ser "deshabilitado" o "habilitado_extra"' })
  tipo: string;

  @IsString({ message: 'El motivo debe ser texto' })
  @IsOptional()
  motivo?: string | null;
}
