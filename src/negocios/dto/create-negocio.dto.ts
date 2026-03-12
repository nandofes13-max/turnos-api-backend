// src/negocios/dto/create-negocio.dto.ts
import { IsString, IsNotEmpty, MaxLength, IsOptional, IsObject, Matches } from 'class-validator';

export class CreateNegocioDto {
  @IsString({ message: 'El nombre debe ser texto' })
  @IsNotEmpty({ message: 'El nombre del negocio es obligatorio' })
  @MaxLength(100, { message: 'El nombre no puede tener más de 100 caracteres' })
  nombre: string;

  // La URL NO se recibe del cliente, se genera automáticamente en el servicio
  // Por eso no está incluida en el DTO de creación

  @IsObject({ message: 'El domicilio debe ser un objeto válido' })
  @IsOptional()
  domicilio?: {
    calle?: string;
    numero?: string;
    codigo_postal?: string;
    localidad?: string;
    provincia?: string;
    pais?: string;
    latitud?: number;
    longitud?: number;
  };

  @IsString({ message: 'El WhatsApp debe ser texto' })
  @IsOptional()
  @MaxLength(20, { message: 'El WhatsApp no puede tener más de 20 caracteres' })
  @Matches(/^\+?[0-9]{10,15}$/, { 
    message: 'El WhatsApp debe tener un formato válido (ej: +5491112345678)' 
  })
  whatsapp?: string;
}
