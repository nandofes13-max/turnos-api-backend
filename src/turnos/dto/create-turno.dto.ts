import { IsNotEmpty, IsNumber, IsString, IsOptional, IsBoolean, IsDateString, IsIn, Min, IsInt, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTurnoDto {
  // ===== RELACIONES (obligatorias) =====
  
  @IsNumber({}, { message: 'El ID del negocio debe ser un número' })
  @IsNotEmpty({ message: 'El ID del negocio es obligatorio' })
  negocioId: number;

  @IsNumber({}, { message: 'El ID del centro debe ser un número' })
  @IsNotEmpty({ message: 'El ID del centro es obligatorio' })
  centroId: number;

  @IsNumber({}, { message: 'El ID de la relación profesional-centro debe ser un número' })
  @IsNotEmpty({ message: 'El ID de la relación profesional-centro es obligatorio' })
  profesionalCentroId: number;

  @IsNumber({}, { message: 'El ID de la especialidad debe ser un número' })
  @IsOptional()
  especialidadId?: number;

  // ===== FECHA Y HORA (NUEVA ESTRUCTURA) =====
  
  @IsDate({ message: 'La fecha del turno debe ser una fecha válida' })
  @IsNotEmpty({ message: 'La fecha del turno es obligatoria' })
  @Type(() => Date)
  fechaTurno: Date;

  @IsString({ message: 'La hora de inicio debe ser un string' })
  @IsNotEmpty({ message: 'La hora de inicio es obligatoria' })
  horaInicio: string;

  @IsString({ message: 'La hora de fin debe ser un string' })
  @IsNotEmpty({ message: 'La hora de fin es obligatoria' })
  horaFin: string;

  @IsInt({ message: 'La duración debe ser un número entero' })
  @Min(1, { message: 'La duración debe ser mayor a 0 minutos' })
  @IsNotEmpty({ message: 'La duración es obligatoria' })
  duracionMinutos: number;

  // ===== ESTADO (opcional) =====
  
  @IsString({ message: 'El estado debe ser texto' })
  @IsOptional()
  @IsIn(['PENDIENTE', 'CONFIRMADO', 'CANCELADO', 'REPROGRAMADO', 'ATENDIDO', 'NO_SHOW', 'BLOQUEADO'])
  estado?: string;

  // ===== PRECIO (opcional) =====
  
  @IsNumber({}, { message: 'El precio debe ser un número' })
  @IsOptional()
  precioReserva?: number;

  @IsString({ message: 'La moneda debe ser texto' })
  @IsOptional()
  @IsIn(['ARS', 'USD', 'EUR'])
  moneda?: string;

  // ===== OBSERVACIONES (opcional) =====
  
  @IsString({ message: 'Las observaciones deben ser texto' })
  @IsOptional()
  observaciones?: string;

  // ===== DATOS DEL USUARIO (para crear o buscar) =====
  
  @IsString({ message: 'El email es obligatorio' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  email: string;

  @IsString({ message: 'El apellido es obligatorio' })
  @IsNotEmpty({ message: 'El apellido es obligatorio' })
  apellido: string;

  @IsString({ message: 'El nombre es obligatorio' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  nombre: string;

  @IsString({ message: 'El teléfono es obligatorio' })
  @IsNotEmpty({ message: 'El teléfono es obligatorio' })
  telefono: string;
}
