import { IsNotEmpty, IsNumber, IsString, IsOptional, IsBoolean, MaxLength, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateNegocioEstadoTurnoDto {
  @IsNumber({}, { message: 'El ID del negocio debe ser un número' })
  @IsNotEmpty({ message: 'El ID del negocio es obligatorio' })
  negocioId: number;

  @IsNumber({}, { message: 'El ID del centro debe ser un número' })
  @IsOptional()
  centroId?: number | null;

  @IsNumber({}, { message: 'El ID de la especialidad debe ser un número' })
  @IsOptional()
  especialidadId?: number | null;

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

  @IsBoolean({ message: 'disponible_slot debe ser verdadero o falso' })
  @IsOptional()
  disponibleSlot?: boolean;

  @IsBoolean({ message: 'disponible_reserva debe ser verdadero o falso' })
  @IsOptional()
  disponibleReserva?: boolean;
}
