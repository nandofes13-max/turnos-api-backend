// src/whatsapp/dto/create-whatsapp-config.dto.ts
import { IsString, IsNotEmpty, IsOptional, Length, IsBoolean } from 'class-validator';

/**
 * DTO para crear/actualizar la configuración de WhatsApp de un negocio
 * 👈 AHORA SOLO RECIBE phoneNumber (y provider opcional)
 * La instancia se asigna automáticamente desde el backend
 */
export class CreateWhatsappConfigDto {
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
