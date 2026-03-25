import { IsNumber, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateProfesionalEspecialidadDto {
  @IsNumber({}, { message: 'El ID del profesional debe ser un número' })
  @IsNotEmpty({ message: 'El ID del profesional es obligatorio' })
  profesionalId: number;

  @IsNumber({}, { message: 'El ID de la especialidad debe ser un número' })
  @IsNotEmpty({ message: 'El ID de la especialidad es obligatorio' })
  especialidadId: number;

  @IsString({ message: 'La descripción debe ser texto' })
  @IsOptional()
  descripcion?: string;
}
