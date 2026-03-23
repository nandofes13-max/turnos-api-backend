import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Profesional } from './entities/profesional.entity';
import { ProfesionalService } from './profesional.service';
import { ProfesionalController } from './profesional.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Profesional])],
  controllers: [ProfesionalController],
  providers: [ProfesionalService],
  exports: [ProfesionalService],
})
export class ProfesionalModule {}
