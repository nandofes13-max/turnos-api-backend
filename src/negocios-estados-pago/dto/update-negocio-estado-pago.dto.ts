import { PartialType } from '@nestjs/mapped-types';
import { CreateNegocioEstadoPagoDto } from './create-negocio-estado-pago.dto';
import { IsOptional, IsString, IsNumber, IsBoolean, Min, MaxLength } from 'class-validator';

export class UpdateNegocioEstadoPagoDto extends PartialType(CreateNegocioEstadoPagoDto) {
  @IsOptional()
  @IsString({ message: 'El nombre del estado debe ser texto' })
  @MaxLength(30, { message: 'El nombre no puede tener más de 30 caracteres' })
  nombre?: string;

  @IsOptional()
  @IsString({ message: 'La descripción debe ser texto' })
  descripcion?: string | null;

  @IsOptional()
  @IsString({ message: 'El código de color debe ser texto' })
  @MaxLength(7, { message: 'El código de color debe tener 7 caracteres (ej: #FF0000)' })
  codigoColor?: string;

  @IsOptional()
  @IsNumber({}, { message: 'El orden debe ser un número' })
  @Min(0, { message: 'El orden debe ser mayor o igual a 0' })
  orden?: number;

  @IsOptional()
  @IsBoolean({ message: 'requiere_pago debe ser verdadero o falso' })
  requierePago?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'permite_cancelar debe ser verdadero o falso' })
  permiteCancelar?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'disponible_slot debe ser verdadero o falso' })
  disponibleSlot?: boolean;
}
