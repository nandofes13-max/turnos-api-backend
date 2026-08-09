// src/whatsapp/dto/create-whatsapp-config.dto.ts
import { IsString, IsNotEmpty, IsOptional, Length, IsBoolean } from 'class-validator';

/**
 * DTO para crear/actualizar la configuración de WhatsApp de un negocio
 */
export class CreateWhatsappConfigDto {
  @IsString({ message: 'El ID de instancia debe ser texto' })
  @IsNotEmpty({ message: 'El ID de instancia es obligatorio' })
  @Length(5, 50, { message: 'El ID de instancia debe tener entre 5 y 50 caracteres' })
  instanceId: string;

  @IsString({ message: 'El token de API debe ser texto' })
  @IsNotEmpty({ message: 'El token de API es obligatorio' })
  @Length(10, 200, { message: 'El token de API debe tener entre 10 y 200 caracteres' })
  apiToken: string;

  @IsOptional()
  @IsString({ message: 'El número de teléfono debe ser texto' })
  @Length(8, 20, { message: 'El número de teléfono debe tener entre 8 y 20 caracteres' })
  phoneNumber?: string;

  @IsOptional()
  @IsString({ message: 'El proveedor debe ser texto' })
  provider?: string; // 'greenapi' | 'meta' (por ahora solo greenapi)

  @IsOptional()
  @IsBoolean({ message: 'Activo debe ser verdadero o falso' })
  activo?: boolean;
}
