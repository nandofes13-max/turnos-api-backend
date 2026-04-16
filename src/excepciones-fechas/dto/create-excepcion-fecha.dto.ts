import { IsNumber, IsNotEmpty, IsString, IsOptional, IsIn, IsDate, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateExcepcionFechaDto {
  @IsNumber({}, { message: 'El ID de la agenda es obligatorio' })
  @IsNotEmpty({ message: 'El ID de la agenda es obligatorio' })
  agendaDisponibilidadId: number;

  @IsDate({ message: 'La fecha desde debe ser una fecha válida' })
  @IsNotEmpty({ message: 'La fecha desde es obligatoria' })
  @Type(() => Date)
  fechaDesde: Date;

  @IsDate({ message: 'La fecha hasta debe ser una fecha válida' })
  @IsOptional()
  @Type(() => Date)
  fechaHasta?: Date | null;

  @ValidateIf(o => o.horaHasta !== undefined)
  @IsString({ message: 'La hora desde debe ser un texto' })
  @IsOptional()
  horaDesde?: string | null;

  @ValidateIf(o => o.horaDesde !== undefined)
  @IsString({ message: 'La hora hasta debe ser un texto' })
  @IsOptional()
  horaHasta?: string | null;

  @IsString({ message: 'El tipo debe ser texto' })
  @IsNotEmpty({ message: 'El tipo es obligatorio' })
  @IsIn(['deshabilitado', 'bloqueado'], { message: 'Tipo debe ser "deshabilitado" o "bloqueado"' })
  tipo: string;

  @IsString({ message: 'El motivo debe ser texto' })
  @IsOptional()
  motivo?: string | null;
}
