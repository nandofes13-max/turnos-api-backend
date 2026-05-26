import { IsEmail, IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';

export class CreateSolicitudDto {
  @IsEmail({}, { message: 'El email debe tener un formato válido' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  @MaxLength(100, { message: 'El email no puede tener más de 100 caracteres' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(50, { message: 'El nombre no puede tener más de 50 caracteres' })
  nombre: string;

  @IsString()
  @IsNotEmpty({ message: 'El apellido es obligatorio' })
  @MaxLength(50, { message: 'El apellido no puede tener más de 50 caracteres' })
  apellido: string;

  @IsString()
  @IsNotEmpty({ message: 'El WhatsApp es obligatorio' })
  @MaxLength(20, { message: 'El WhatsApp no puede tener más de 20 caracteres' })
  whatsapp: string;

  @IsString()
  @IsNotEmpty({ message: 'Por favor, describí qué actividad o servicio necesitas' })
  @MaxLength(1000, { message: 'El mensaje no puede tener más de 1000 caracteres' })
  mensaje: string;
}
