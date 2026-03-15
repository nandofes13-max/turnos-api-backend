// src/negocios-usuarios-roles/dto/create-negocio-usuario-rol.dto.ts
import { IsNumber, IsNotEmpty } from 'class-validator';

export class CreateNegocioUsuarioRolDto {
  @IsNumber({}, { message: 'El ID del negocio debe ser un número' })
  @IsNotEmpty({ message: 'El ID del negocio es obligatorio' })
  negocioId: number;

  @IsNumber({}, { message: 'El ID del usuario debe ser un número' })
  @IsNotEmpty({ message: 'El ID del usuario es obligatorio' })
  usuarioId: number;

  @IsNumber({}, { message: 'El ID del rol debe ser un número' })
  @IsNotEmpty({ message: 'El ID del rol es obligatorio' })
  rolId: number;
}
