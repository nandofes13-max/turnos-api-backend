import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TurnosService } from './turnos.service';
import { TurnosController } from './turnos.controller';
import { Turno } from './entities/turno.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { NegocioUsuarioRol } from '../negocios-usuarios-roles/entities/negocio-usuario-rol.entity';
import { Rol } from '../roles/entities/rol.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Turno,
      Usuario,
      NegocioUsuarioRol,
      Rol,
    ]),
  ],
  controllers: [TurnosController],
  providers: [TurnosService],
  exports: [TurnosService],
})
export class TurnosModule {}
