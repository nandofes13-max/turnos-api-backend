// src/whatsapp/dto/create-instancia-whatsapp.dto.ts
import { IsString, IsNotEmpty, Length } from 'class-validator';

/**
 * DTO para crear una nueva instancia de GREEN API
 * El administrador solo ingresa instanceId y apiToken
 * El resto de los campos se completan automáticamente
 */
export class CreateInstanciaWhatsappDto {
  @IsString({ message: 'El ID de instancia debe ser texto' })
  @IsNotEmpty({ message: 'El ID de instancia es obligatorio' })
  @Length(5, 50, { message: 'El ID de instancia debe tener entre 5 y 50 caracteres' })
  instanceId: string;

  @IsString({ message: 'El token de API debe ser texto' })
  @IsNotEmpty({ message: 'El token de API es obligatorio' })
  @Length(10, 200, { message: 'El token de API debe tener entre 10 y 200 caracteres' })
  apiToken: string;
}
