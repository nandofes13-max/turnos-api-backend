// src/negocios-usuarios-roles/dto/update-negocio-usuario-rol.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateNegocioUsuarioRolDto } from './create-negocio-usuario-rol.dto';

export class UpdateNegocioUsuarioRolDto extends PartialType(CreateNegocioUsuarioRolDto) {}
