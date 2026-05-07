import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NegociosEstadosPagoService } from './negocios-estados-pago.service';
import { NegociosEstadosPagoController } from './negocios-estados-pago.controller';
import { NegocioEstadoPago } from './entities/negocio-estado-pago.entity';
import { Negocio } from '../negocios/entities/negocio.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NegocioEstadoPago,
      Negocio,
    ]),
  ],
  controllers: [NegociosEstadosPagoController],
  providers: [NegociosEstadosPagoService],
  exports: [NegociosEstadosPagoService],
})
export class NegociosEstadosPagoModule {}
