import { IsNotEmpty, IsOptional, IsString, MaxLength, IsIn, IsNumber, Min, Max } from 'class-validator';

export class CreateExcepcionRecurrenteDto {
  @IsNotEmpty({ message: 'El profesionalCentroEspecialidadId es obligatorio' })
  @IsNumber({}, { message: 'profesionalCentroEspecialidadId debe ser un número' })
  profesionalCentroEspecialidadId: number;

  @IsNotEmpty({ message: 'El día de semana es obligatorio' })
  @IsNumber({}, { message: 'diaSemana debe ser un número' })
  @Min(0, { message: 'diaSemana debe ser entre 0 (Domingo) y 6 (Sábado)' })
  @Max(6, { message: 'diaSemana debe ser entre 0 (Domingo) y 6 (Sábado)' })
  diaSemana: number;

  @IsNotEmpty({ message: 'La hora desde es obligatoria' })
  @IsString({ message: 'horaDesde debe ser una hora válida (HH:MM:SS)' })
  horaDesde: string;

  @IsNotEmpty({ message: 'La hora hasta es obligatoria' })
  @IsString({ message: 'horaHasta debe ser una hora válida (HH:MM:SS)' })
  horaHasta: string;

  @IsNotEmpty({ message: 'El tipo es obligatorio' })
  @IsIn(['deshabilitado', 'habilitado_extra'], { message: 'tipo debe ser "deshabilitado" o "habilitado_extra"' })
  tipo: string;

  @IsOptional()
  @IsString({ message: 'motivo debe ser texto' })
  @MaxLength(500, { message: 'motivo no puede superar los 500 caracteres' })
  motivo?: string | null;
}
