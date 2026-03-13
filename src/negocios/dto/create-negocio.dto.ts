// src/negocios/dto/create-negocio.dto.ts
import { IsString, IsNotEmpty, MaxLength, IsObject, Matches } from 'class-validator';

export class CreateNegocioDto {
  @IsString({ message: 'El nombre debe ser texto' })
  @IsNotEmpty({ message: 'El nombre del negocio es obligatorio' })
  @MaxLength(100, { message: 'El nombre no puede tener más de 100 caracteres' })
  nombre: string;

  @IsObject({ message: 'El domicilio debe ser un objeto válido' })
  @IsNotEmpty({ message: 'El domicilio es obligatorio' })
  domicilio: {
    calle: string;
    numero: string;
    codigo_postal: string;
    localidad: string;
    provincia: string;
    pais: string;
    latitud?: number;
    longitud?: number;
  };

  @IsString({ message: 'El WhatsApp debe ser texto' })
  @IsNotEmpty({ message: 'El WhatsApp es obligatorio' })
  @MaxLength(20, { message: 'El WhatsApp no puede tener más de 20 caracteres' })
  @Matches(/^\+[1-9]{1}[0-9]{1,14}$/, { 
    message: 'El WhatsApp debe tener formato internacional válido (ej: +5491112345678)' 
  })
  whatsapp: string;
}
