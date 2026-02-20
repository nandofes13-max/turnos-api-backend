import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Filial } from '../entities/filial.entity';
import { FilialService } from './filial.service';
import { FilialController } from './filial.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Filial])],
  providers: [FilialService],
  controllers: [FilialController],
})
export class FilialModule {}
