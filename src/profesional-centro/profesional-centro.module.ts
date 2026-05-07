// src/profesional-centro/profesional-centro.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfesionalCentro } from './entities/profesional-centro.entity';
import { ProfesionalCentroService } from './profesional-centro.service';
import { ProfesionalCentroController } from './profesional-centro.controller';
import { CentroModule } from '../centro/centro.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProfesionalCentro]),
    forwardRef(() => CentroModule),  // 👈 AGREGAR si es necesario
  ],
  controllers: [ProfesionalCentroController],
  providers: [ProfesionalCentroService],
  exports: [ProfesionalCentroService],
})
export class ProfesionalCentroModule {}
