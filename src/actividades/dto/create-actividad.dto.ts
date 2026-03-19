// src/actividades/dto/create-actividad.dto.ts
import { IsString, IsNotEmpty, MaxLength, IsNumber } from 'class-validator';

export class CreateActividadDto {
  @IsString({ message: 'El nombre debe ser texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(100, { message: 'El nombre no puede tener más de 100 caracteres' })
  nombre: string;

  // 👇 NUEVO: ID del negocio al que pertenece la actividad
  @IsNumber({}, { message: 'El ID del negocio debe ser un número' })
  @IsNotEmpty({ message: 'El ID del negocio es obligatorio' })
  negocioId: number;
}
