// src/negocios/dto/create-negocio.dto.ts
import { IsString, IsNotEmpty, MaxLength, IsObject, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class CreateNegocioDto {
  @IsString({ message: 'El nombre debe ser texto' })
  @IsNotEmpty({ message: 'El nombre del negocio es obligatorio' })
  @MaxLength(100, { message: 'El nombre no puede tener más de 100 caracteres' })
  nombre: string;

  // Campos de WhatsApp (nuevos)
  @IsNumber({}, { message: 'El código de país debe ser un número' })
  @IsNotEmpty({ message: 'El código de país es obligatorio' })
  @Min(1, { message: 'El código de país debe ser mayor a 0' })
  @Max(999, { message: 'El código de país no puede tener más de 3 dígitos' })
  country_code: number;

  @IsString({ message: 'El número nacional debe ser texto' })
  @IsNotEmpty({ message: 'El número nacional es obligatorio' })
  @MaxLength(15, { message: 'El número nacional no puede tener más de 15 dígitos' })
  national_number: string;

  // Este campo se generará automáticamente en el servicio, no viene del cliente
  // whatsapp_e164: string;

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
}
