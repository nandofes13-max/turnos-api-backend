import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Centro } from './entities/centro.entity';
import { CentroService } from './centro.service';
import { CentroController } from './centro.controller';
import { NegociosModule } from '../negocios/negocios.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Centro]),
    forwardRef(() => NegociosModule),
  ],
  controllers: [CentroController],
  providers: [CentroService],
  exports: [CentroService],
})
export class CentroModule {}
