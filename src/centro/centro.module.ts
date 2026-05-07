import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Centro } from './entities/centro.entity';
import { CentroService } from './centro.service';
import { CentroController } from './centro.controller';
import { NegociosModule } from '../negocios/negocios.module';
import { ProfesionalCentroModule } from '../profesional-centro/profesional-centro.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Centro]),
    forwardRef(() => NegociosModule),
    forwardRef(() => ProfesionalCentroModule),
  ],
  controllers: [CentroController],
  providers: [CentroService],
  exports: [CentroService],
})
export class CentroModule {}
