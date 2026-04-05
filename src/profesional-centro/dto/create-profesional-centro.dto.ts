import { IsNumber, IsNotEmpty } from 'class-validator';

export class CreateProfesionalCentroDto {
  @IsNumber({}, { message: 'El ID del profesional debe ser un número' })
  @IsNotEmpty({ message: 'El ID del profesional es obligatorio' })
  profesionalId: number;

  @IsNumber({}, { message: 'El ID de la especialidad debe ser un número' })
  @IsNotEmpty({ message: 'El ID de la especialidad es obligatorio' })
  especialidadId: number;

  @IsNumber({}, { message: 'El ID del centro debe ser un número' })
  @IsNotEmpty({ message: 'El ID del centro es obligatorio' })
  centroId: number;
}
