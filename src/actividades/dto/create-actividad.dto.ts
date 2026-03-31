// src/actividades/dto/create-actividad.dto.ts
import { IsString, IsNotEmpty, MaxLength, IsBoolean, IsOptional } from 'class-validator';

export class CreateActividadDto {
  @IsString({ message: 'El nombre debe ser texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(100, { message: 'El nombre no puede tener más de 100 caracteres' })
  nombre: string;

  @IsBoolean({ message: 'Virtual debe ser verdadero o falso' })
  @IsOptional()
  virtual?: boolean;
}
