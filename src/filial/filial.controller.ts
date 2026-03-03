// src/filial/filial.controller.ts
import { Body, Controller, Get, Param, Post, Put, Delete } from '@nestjs/common';
import { FilialService } from './filial.service';
import { Filial } from '../entities/filial.entity';

@Controller('filiales')
export class FilialController {
  constructor(private readonly filialService: FilialService) {}

  // Listar todas las filiales con último movimiento calculado
  @Get()
  async findAll(): Promise<any[]> {
    const filiales = await this.filialService.findAll();
    
    // Agregar campo ultimoMovimiento a cada filial
    return filiales.map(filial => this.agregarUltimoMovimiento(filial));
  }

  // Obtener una filial por ID con último movimiento calculado
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<any> {
    const filial = await this.filialService.findOne(Number(id));
    return this.agregarUltimoMovimiento(filial);
  }

  // Crear nueva filial
  @Post()
  async create(@Body() body: Partial<Filial>): Promise<any> {
    // Para demo, usuario por defecto "demo"
    const filial = await this.filialService.create(body, 'demo');
    return this.agregarUltimoMovimiento(filial);
  }

  // Actualizar filial existente
  @Put(':id')
  async update(@Param('id') id: string, @Body() body: Partial<Filial>): Promise<any> {
    const filial = await this.filialService.update(Number(id), body, 'demo');
    return this.agregarUltimoMovimiento(filial);
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

  // ===== FUNCIÓN AUXILIAR =====
  private agregarUltimoMovimiento(filial: Filial): any {
    // Convertir a objeto plano para poder agregar propiedades
    const filialObj = { ...filial };
    
    // Calcular último movimiento
    let ultimoMovimiento = 'Sin información';
    
    if (filial.fecha_baja && filial.usuario_baja) {
      ultimoMovimiento = `${filial.usuario_baja} - BAJA - ${this.formatearFecha(filial.fecha_baja)}`;
    } 
    else if (filial.fecha_modificacion && 
             filial.fecha_alta && 
             new Date(filial.fecha_modificacion).getTime() !== new Date(filial.fecha_alta).getTime() && 
             filial.usuario_modificacion) {
      ultimoMovimiento = `${filial.usuario_modificacion} - MODIFICACIÓN - ${this.formatearFecha(filial.fecha_modificacion)}`;
    } 
    else if (filial.usuario_alta) {
      ultimoMovimiento = `${filial.usuario_alta} - ALTA - ${this.formatearFecha(filial.fecha_alta)}`;
    }
    
    // Agregar el campo al objeto
    filialObj.ultimoMovimiento = ultimoMovimiento;
    
    return filialObj;
  }

  private formatearFecha(fecha: Date): string {
    return new Date(fecha).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).replace(',', '');
  }
}
