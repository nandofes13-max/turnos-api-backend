import { IsNotEmpty, IsNumber, IsString, IsOptional, IsBoolean, MaxLength, Min } from 'class-validator';

export class CreateNegocioEstadoPagoDto {
  @IsNumber({}, { message: 'El ID del negocio debe ser un número' })
  @IsNotEmpty({ message: 'El ID del negocio es obligatorio' })
  negocioId: number;

  @IsString({ message: 'El nombre del estado debe ser texto' })
  @IsNotEmpty({ message: 'El nombre del estado es obligatorio' })
  @MaxLength(30, { message: 'El nombre no puede tener más de 30 caracteres' })
  nombre: string;

  @IsString({ message: 'La descripción debe ser texto' })
  @IsOptional()
  descripcion?: string | null;

  @IsString({ message: 'El código de color debe ser texto' })
  @IsOptional()
  @MaxLength(7, { message: 'El código de color debe tener 7 caracteres (ej: #FF0000)' })
  codigoColor?: string;

  @IsNumber({}, { message: 'El orden debe ser un número' })
  @IsOptional()
  @Min(0, { message: 'El orden debe ser mayor o igual a 0' })
  orden?: number;

  @IsBoolean({ message: 'requiere_pago debe ser verdadero o falso' })
  @IsOptional()
  requierePago?: boolean;

  @IsBoolean({ message: 'permite_cancelar debe ser verdadero o falso' })
  @IsOptional()
  permiteCancelar?: boolean;

  @IsBoolean({ message: 'disponible_slot debe ser verdadero o falso' })
  @IsOptional()
  disponibleSlot?: boolean;
}
