import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NegociosEstadosTurnoService } from './negocios-estados-turno.service';
import { NegociosEstadosTurnoController } from './negocios-estados-turno.controller';
import { NegocioEstadoTurno } from './entities/negocio-estado-turno.entity';
import { Negocio } from '../negocios/entities/negocio.entity';
import { Centro } from '../centro/entities/centro.entity';
import { Especialidad } from '../especialidades/entities/especialidad.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NegocioEstadoTurno,
      Negocio,
      Centro,
      Especialidad,
    ]),
  ],
  controllers: [NegociosEstadosTurnoController],
  providers: [NegociosEstadosTurnoService],
  exports: [NegociosEstadosTurnoService],
})
export class NegociosEstadosTurnoModule {}
