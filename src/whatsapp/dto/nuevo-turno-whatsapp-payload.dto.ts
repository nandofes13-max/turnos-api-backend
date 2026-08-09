// src/whatsapp/dto/nuevo-turno-whatsapp-payload.dto.ts
import { IsString, IsNotEmpty, IsOptional, Length } from 'class-validator';

/**
 * DTO para el payload de notificación de nuevo turno
 * Este objeto es independiente del proveedor (GREEN API, Meta, etc.)
 */
export class NuevoTurnoWhatsappPayloadDto {
  @IsString({ message: 'El nombre del cliente debe ser texto' })
  @IsNotEmpty({ message: 'El nombre del cliente es obligatorio' })
  @Length(2, 100, { message: 'El nombre del cliente debe tener entre 2 y 100 caracteres' })
  cliente: string;

  @IsString({ message: 'La fecha debe ser texto' })
  @IsNotEmpty({ message: 'La fecha es obligatoria' })
  @Length(10, 10, { message: 'La fecha debe tener formato YYYY-MM-DD' })
  fecha: string;

  @IsString({ message: 'La hora debe ser texto' })
  @IsNotEmpty({ message: 'La hora es obligatoria' })
  @Length(5, 5, { message: 'La hora debe tener formato HH:MM' })
  hora: string;

  @IsOptional()
  @IsString({ message: 'El teléfono debe ser texto' })
  @Length(5, 20, { message: 'El teléfono debe tener entre 5 y 20 caracteres' })
  telefono?: string;
}
