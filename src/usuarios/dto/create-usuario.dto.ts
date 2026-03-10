// src/usuarios/dto/create-usuario.dto.ts
import { IsEmail, IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';

export class CreateUsuarioDto {
  @IsEmail({}, { message: 'El email debe tener un formato válido' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  @MaxLength(100, { message: 'El email no puede tener más de 100 caracteres' })
  email: string;

  @IsString()
  @IsOptional()
  @MaxLength(255, { message: 'La contraseña no puede tener más de 255 caracteres' })
  password_hash?: string;

  @IsString()
  @IsNotEmpty({ message: 'El apellido es obligatorio' })
  @MaxLength(50, { message: 'El apellido no puede tener más de 50 caracteres' })
  apellido: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(50, { message: 'El nombre no puede tener más de 50 caracteres' })
  nombre: string;

  @IsString()
  @IsOptional()
  @MaxLength(20, { message: 'El teléfono no puede tener más de 20 caracteres' })
  telefono?: string;
}
