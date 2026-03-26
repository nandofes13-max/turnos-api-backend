import { IsString, IsNotEmpty, IsNumber, Min, Max, IsObject, ValidateNested, IsOptional, IsLatitude, IsLongitude, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

// DTO para el domicilio estructurado (mismo que Negocios)
export class DomicilioDto {
  @IsString({ message: 'La calle debe ser texto' })
  @IsNotEmpty({ message: 'La calle es obligatoria' })
  @MaxLength(120, { message: 'La calle no puede tener más de 120 caracteres' })
  street: string;

  @IsString({ message: 'El número debe ser texto' })
  @IsNotEmpty({ message: 'El número es obligatorio' })
  @MaxLength(20, { message: 'El número no puede tener más de 20 caracteres' })
  street_number: string;

  @IsString({ message: 'El código postal debe ser texto' })
  @IsNotEmpty({ message: 'El código postal es obligatorio' })
  @MaxLength(20, { message: 'El código postal no puede tener más de 20 caracteres' })
  postal_code: string;

  @IsString({ message: 'La ciudad debe ser texto' })
  @IsNotEmpty({ message: 'La ciudad es obligatoria' })
  @MaxLength(120, { message: 'La ciudad no puede tener más de 120 caracteres' })
  city: string;

  @IsString({ message: 'La provincia debe ser texto' })
  @IsNotEmpty({ message: 'La provincia es obligatoria' })
  @MaxLength(120, { message: 'La provincia no puede tener más de 120 caracteres' })
  state: string;

  @IsString({ message: 'El país debe ser texto' })
  @IsNotEmpty({ message: 'El país es obligatorio' })
  @MaxLength(120, { message: 'El país no puede tener más de 120 caracteres' })
  country: string;

  @IsString({ message: 'El código de país debe ser texto' })
  @IsNotEmpty({ message: 'El código de país es obligatorio' })
  @MaxLength(2, { message: 'El código de país debe tener 2 caracteres' })
  country_code: string;

  @IsLatitude({ message: 'La latitud no es válida' })
  @IsNotEmpty({ message: 'La latitud es obligatoria' })
  latitude: number;

  @IsLongitude({ message: 'La longitud no es válida' })
  @IsNotEmpty({ message: 'La longitud es obligatoria' })
  longitude: number;

  @IsString({ message: 'La dirección formateada debe ser texto' })
  @IsNotEmpty({ message: 'La dirección formateada es obligatoria' })
  formatted_address: string;
}

// DTO principal para crear centro
export class CreateCentroDto {
  @IsNumber({}, { message: 'El ID del negocio debe ser un número' })
  @IsNotEmpty({ message: 'El ID del negocio es obligatorio' })
  negocioId: number;

  @IsString({ message: 'El nombre debe ser texto' })
  @IsNotEmpty({ message: 'El nombre del centro es obligatorio' })
  @MaxLength(100, { message: 'El nombre no puede tener más de 100 caracteres' })
  nombre: string;

  // WhatsApp
  @IsNumber({}, { message: 'El código de país debe ser un número' })
  @IsNotEmpty({ message: 'El código de país es obligatorio' })
  @Min(1, { message: 'El código de país debe ser mayor a 0' })
  @Max(999, { message: 'El código de país no puede tener más de 3 dígitos' })
  country_code: number;

  @IsString({ message: 'El número nacional debe ser texto' })
  @IsNotEmpty({ message: 'El número nacional es obligatorio' })
  @MaxLength(15, { message: 'El número nacional no puede tener más de 15 dígitos' })
  national_number: string;

  // Domicilio
  @IsObject({ message: 'El domicilio debe ser un objeto válido' })
  @ValidateNested()
  @Type(() => DomicilioDto)
  @IsNotEmpty({ message: 'El domicilio es obligatorio' })
  domicilio: DomicilioDto;
}
