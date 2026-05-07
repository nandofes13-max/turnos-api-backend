import { PartialType } from '@nestjs/mapped-types';
import { CreateTurnoDto } from './create-turno.dto';
import { IsOptional, IsString, IsDateString, IsInt, IsIn, Min, IsBoolean, IsNumber } from 'class-validator';

export class UpdateTurnoDto extends PartialType(CreateTurnoDto) {
  @IsOptional()
  @IsDateString({}, { message: 'La fecha de inicio debe ser una fecha válida (ISO)' })
  inicio?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de fin debe ser una fecha válida (ISO)' })
  fin?: string;

  @IsOptional()
  @IsInt({ message: 'La duración debe ser un número entero' })
  @Min(1, { message: 'La duración debe ser mayor a 0 minutos' })
  duracionMinutos?: number;

  @IsOptional()
  @IsString({ message: 'El estado debe ser texto' })
  @IsIn(['PENDIENTE', 'CONFIRMADO', 'CANCELADO', 'REPROGRAMADO', 'ATENDIDO', 'NO_SHOW', 'BLOQUEADO'])
  estado?: string;

  @IsOptional()
  @IsBoolean({ message: 'confirmado debe ser verdadero o falso' })
  confirmado?: boolean;

  @IsOptional()
  @IsString({ message: 'El motivo de cancelación debe ser texto' })
  motivoCancelacion?: string;

  @IsOptional()
  @IsString({ message: 'Las observaciones deben ser texto' })
  observaciones?: string;

  @IsOptional()
  @IsNumber({}, { message: 'El precio debe ser un número' })
  precioReserva?: number;

  @IsOptional()
  @IsString({ message: 'La moneda debe ser texto' })
  @IsIn(['ARS', 'USD', 'EUR'])
  moneda?: string;
}
