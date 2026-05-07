import { IsNotEmpty, IsNumber, IsString, IsOptional, IsBoolean, IsDateString, IsIn, Min, IsInt } from 'class-validator';
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

  // ===== FECHA Y HORA =====
  
  @IsDateString({}, { message: 'La fecha de inicio debe ser una fecha válida (ISO)' })
  @IsNotEmpty({ message: 'La fecha de inicio es obligatoria' })
  inicio: string;  // "2026-05-11T20:00:00-03:00"

  @IsDateString({}, { message: 'La fecha de fin debe ser una fecha válida (ISO)' })
  @IsNotEmpty({ message: 'La fecha de fin es obligatoria' })
  fin: string;  // "2026-05-11T20:30:00-03:00"

  @IsInt({ message: 'La duración debe ser un número entero' })
  @Min(1, { message: 'La duración debe ser mayor a 0 minutos' })
  @IsNotEmpty({ message: 'La duración es obligatoria' })
  duracionMinutos: number;

  // ===== ESTADO (opcional, por defecto 'PENDIENTE') =====
  
  @IsString({ message: 'El estado debe ser texto' })
  @IsOptional()
  @IsIn(['PENDIENTE', 'CONFIRMADO', 'CANCELADO', 'REPROGRAMADO', 'ATENDIDO', 'NO_SHOW', 'BLOQUEADO'])
  estado?: string;

  // ===== PRECIO (opcional por ahora) =====
  
  @IsNumber({}, { message: 'El precio debe ser un número' })
  @IsOptional()
  precioReserva?: number;

  @IsString({ message: 'La moneda debe ser texto' })
  @IsOptional()
  @IsIn(['ARS', 'USD', 'EUR'])
  moneda?: string;

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
