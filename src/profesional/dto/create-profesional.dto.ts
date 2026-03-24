import { IsString, IsEmail, IsOptional, IsNotEmpty, Length, Matches, IsNumber, Min, Max } from 'class-validator';

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

  // WhatsApp
  @IsNumber({}, { message: 'El código de país debe ser un número' })
  @IsNotEmpty({ message: 'El código de país es obligatorio' })
  @Min(1, { message: 'El código de país debe ser mayor a 0' })
  @Max(999, { message: 'El código de país no puede tener más de 3 dígitos' })
  country_code: number;

  @IsString({ message: 'El número nacional debe ser texto' })
  @IsNotEmpty({ message: 'El número nacional es obligatorio' })
  @Length(6, 15, { message: 'El número nacional debe tener entre 6 y 15 dígitos' })
  national_number: string;

  // Género
  @IsString({ message: 'El género debe ser un texto' })
  @IsOptional()
  @Matches(/^[MF]$/, { message: 'El género debe ser M (Masculino) o F (Femenino)' })
  genero?: string;

  @IsString({ message: 'La matrícula debe ser un texto' })
  @IsOptional()
  matricula?: string;

  @IsString({ message: 'La foto debe ser una URL' })
  @IsOptional()
  foto?: string;
}
