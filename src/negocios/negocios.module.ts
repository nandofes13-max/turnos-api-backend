// src/negocios/negocios.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Negocio } from './entities/negocio.entity';
import { NegociosService } from './negocios.service';
import { NegociosController } from './negocios.controller';
import { CentroModule } from '../centro/centro.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Negocio]),
    forwardRef(() => CentroModule),
  ],
  providers: [NegociosService],
  controllers: [NegociosController],
  exports: [NegociosService],
})
export class NegociosModule {}
