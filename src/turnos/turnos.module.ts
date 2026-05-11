import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TurnosService } from './turnos.service';
import { TurnosController } from './turnos.controller';
import { Turno } from './entities/turno.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { NegocioUsuarioRol } from '../negocios-usuarios-roles/entities/negocio-usuario-rol.entity';
import { Rol } from '../roles/entities/rol.entity';
import { NegocioEstadoTurno } from '../negocios-estados-turno/entities/negocio-estado-turno.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Turno,
      Usuario,
      NegocioUsuarioRol,
      Rol,
      NegocioEstadoTurno,
    ]),
  ],
  controllers: [TurnosController],
  providers: [TurnosService],
  exports: [TurnosService],
})
export class TurnosModule {}
