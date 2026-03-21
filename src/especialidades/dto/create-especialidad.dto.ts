// src/especialidades/dto/create-especialidad.dto.ts
import { IsString, IsNotEmpty, MaxLength, IsNumber, IsOptional, IsInt } from 'class-validator';

export class CreateEspecialidadDto {
  @IsString({ message: 'El nombre debe ser texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(100, { message: 'El nombre no puede tener más de 100 caracteres' })
  nombre: string;

  @IsString({ message: 'La descripción debe ser texto' })
  @IsOptional()
  descripcion?: string;

  @IsNumber({}, { message: 'El ID de la actividad debe ser un número' })
  @IsNotEmpty({ message: 'El ID de la actividad es obligatorio' })
  @IsInt({ message: 'El ID de la actividad debe ser un número entero' })
  actividadId: number;
}
