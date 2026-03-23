import { IsString, IsEmail, IsOptional, IsNotEmpty, Length, Matches } from 'class-validator';

export class CreateProfesionalDto {
  @IsString({ message: 'El documento debe ser un texto' })
  @IsNotEmpty({ message: 'El documento es obligatorio' })
  @Length(8, 20, { message: 'El documento debe tener entre 8 y 20 caracteres' })
  documento: string;

  @IsString({ message: 'El nombre debe ser un texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @Length(3, 100, { message: 'El nombre debe tener entre 3 y 100 caracteres' })
  nombre: string;

  @IsEmail({}, { message: 'El email no es válido' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  email: string;

  @IsString({ message: 'El WhatsApp debe ser un texto' })
  @IsNotEmpty({ message: 'El WhatsApp es obligatorio' })
  @Matches(/^\+[1-9]\d{1,14}$/, { 
    message: 'El WhatsApp debe tener formato internacional: +5491112345678' 
  })
  whatsapp: string;

  @IsString({ message: 'La matrícula debe ser un texto' })
  @IsOptional()
  matricula?: string;

  @IsString({ message: 'La foto debe ser una URL' })
  @IsOptional()
  foto?: string;
}
