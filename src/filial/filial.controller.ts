import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { FilialService } from './filial.service';
import { Filial } from '../entities/filial.entity';

@Controller('filiales')
export class FilialController {
  constructor(private readonly filialService: FilialService) {}

  @Get()
  findAll(): Promise<Filial[]> {
    return this.filialService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Filial> {
    return this.filialService.findOne(Number(id));
  }

  @Post()
  create(@Body() body: Partial<Filial>): Promise<Filial> {
    return this.filialService.create(body);
  }
}
