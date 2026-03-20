// src/negocio-actividades/negocio-actividades.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NegocioActividad } from './entities/negocio-actividad.entity';
import { Negocio } from '../negocios/entities/negocio.entity';
import { Actividad } from '../actividades/entities/actividad.entity';
import { NegocioActividadesService } from './negocio-actividades.service';
import { NegocioActividadesController } from './negocio-actividades.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([NegocioActividad, Negocio, Actividad])
  ],
  providers: [NegocioActividadesService],
  controllers: [NegocioActividadesController],
})
export class NegocioActividadesModule {}
