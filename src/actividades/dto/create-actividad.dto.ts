import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateActividadDto {
  @IsString({ message: 'El nombre debe ser texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  nombre: string;

  @IsString({ message: 'La descripción debe ser texto' })
  @IsOptional()
  descripcion?: string;

  @IsBoolean({ message: 'Virtual debe ser verdadero o falso' })
  @IsOptional()
  virtual?: boolean;
}
