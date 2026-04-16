import { IsNotEmpty, IsOptional, IsDateString, IsString, MaxLength, IsIn, IsNumber } from 'class-validator';

export class CreateExcepcionFechaDto {
  @IsNotEmpty()
  @IsNumber()
  agendaDisponibilidadId: number;

  @IsNotEmpty()
  @IsDateString()
  fechaDesde: Date;

  @IsOptional()
  @IsDateString()
  fechaHasta?: Date | null;

  @IsOptional()
  @IsString()
  horaDesde?: string | null;

  @IsOptional()
  @IsString()
  horaHasta?: string | null;

  @IsNotEmpty()
  @IsIn(['deshabilitado', 'bloqueado'])
  tipo: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivo?: string | null;
}
