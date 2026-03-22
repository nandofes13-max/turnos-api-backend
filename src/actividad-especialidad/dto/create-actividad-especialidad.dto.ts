// src/actividad-especialidad/dto/create-actividad-especialidad.dto.ts
import { IsNumber, IsNotEmpty } from 'class-validator';

export class CreateActividadEspecialidadDto {
  @IsNumber({}, { message: 'El ID de la actividad debe ser un número' })
  @IsNotEmpty({ message: 'El ID de la actividad es obligatorio' })
  actividadId: number;

  @IsNumber({}, { message: 'El ID de la especialidad debe ser un número' })
  @IsNotEmpty({ message: 'El ID de la especialidad es obligatorio' })
  especialidadId: number;
}
