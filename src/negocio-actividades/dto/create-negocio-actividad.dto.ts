// src/negocio-actividades/dto/create-negocio-actividad.dto.ts
import { IsNumber, IsNotEmpty } from 'class-validator';

export class CreateNegocioActividadDto {
  @IsNumber({}, { message: 'El ID del negocio debe ser un número' })
  @IsNotEmpty({ message: 'El ID del negocio es obligatorio' })
  negocioId: number;

  @IsNumber({}, { message: 'El ID de la actividad debe ser un número' })
  @IsNotEmpty({ message: 'El ID de la actividad es obligatorio' })
  actividadId: number;
}
