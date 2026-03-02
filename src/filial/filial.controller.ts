// src/filial/filial.controller.ts
import { Body, Controller, Get, Param, Post, Put, Delete } from '@nestjs/common';
import { FilialService } from './filial.service';
import { Filial } from '../entities/filial.entity';

@Controller('filiales')
export class FilialController {
  constructor(private readonly filialService: FilialService) {}

  // Listar todas las filiales
  @Get()
  findAll(): Promise<Filial[]> {
    return this.filialService.findAll();
  }

  // Obtener una filial por ID
  @Get(':id')
  findOne(@Param('id') id: string): Promise<Filial> {
    return this.filialService.findOne(Number(id));
  }

  // Crear nueva filial
  @Post()
  create(@Body() body: Partial<Filial>): Promise<Filial> {
    // Para demo, usuario por defecto "demo"
    return this.filialService.create(body, 'demo');
  }

  // Actualizar filial existente
  @Put(':id')
  update(@Param('id') id: string, @Body() body: Partial<Filial>): Promise<Filial> {
    return this.filialService.update(Number(id), body, 'demo');
  }

  // Soft delete de una filial
  @Delete(':id')
  softDelete(@Param('id') id: string): Promise<void> {
    return this.filialService.softDelete(Number(id), 'demo');
  }

  // Debug: ver estructura de tabla
  @Get('debug/structure')
  debugStructure() {
    return this.filialService.debugStructure();
  }
}
