// src/negocios-usuarios-roles/negocios-usuarios-roles.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NegocioUsuarioRol } from './entities/negocio-usuario-rol.entity';
import { Negocio } from '../negocios/entities/negocio.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Rol } from '../roles/entities/rol.entity';
import { NegociosUsuariosRolesService } from './negocios-usuarios-roles.service';
import { NegociosUsuariosRolesController } from './negocios-usuarios-roles.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([NegocioUsuarioRol, Negocio, Usuario, Rol])
  ],
  providers: [NegociosUsuariosRolesService],
  controllers: [NegociosUsuariosRolesController],
})
export class NegociosUsuariosRolesModule {}
