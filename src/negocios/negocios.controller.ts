// src/negocios/negocios.controller.ts
import { Body, Controller, Get, Param, Post, Put, Delete } from '@nestjs/common';
import { NegociosService } from './negocios.service';
import { Negocio } from './entities/negocio.entity';
import { CreateNegocioDto } from './dto/create-negocio.dto';
import { UpdateNegocioDto } from './dto/update-negocio.dto';

@Controller('negocios')
export class NegociosController {
  constructor(private readonly negociosService: NegociosService) {}

  // Listar todos los negocios con último movimiento calculado
  @Get()
  async findAll(): Promise<any[]> {
    const negocios = await this.negociosService.findAll();
    return negocios.map(negocio => this.agregarUltimoMovimiento(negocio));
  }

  // Obtener un negocio por ID con último movimiento calculado
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<any> {
    const negocio = await this.negociosService.findOne(Number(id));
    return this.agregarUltimoMovimiento(negocio);
  }

  // Obtener un negocio por URL (para la agenda pública)
  @Get('url/:url')
  async findByUrl(@Param('url') url: string): Promise<any> {
    const negocio = await this.negociosService.findByUrl(url);
    if (!negocio) {
      return { message: 'Negocio no encontrado' };
    }
    return this.agregarUltimoMovimiento(negocio);
  }

  // Crear nuevo negocio (genera URL automáticamente)
  @Post()
  async create(@Body() createNegocioDto: CreateNegocioDto): Promise<any> {
    const negocio = await this.negociosService.create(createNegocioDto, 'demo');
    return this.agregarUltimoMovimiento(negocio);
  }

  // Actualizar negocio existente (no modifica la URL)
  @Put(':id')
  async update(@Param('id') id: string, @Body() updateNegocioDto: UpdateNegocioDto): Promise<any> {
    const negocio = await this.negociosService.update(Number(id), updateNegocioDto, 'demo');
    return this.agregarUltimoMovimiento(negocio);
  }

  // Soft delete de un negocio
  @Delete(':id')
  softDelete(@Param('id') id: string): Promise<void> {
    return this.negociosService.softDelete(Number(id), 'demo');
  }

  // Debug: ver estructura de tabla
  @Get('debug/structure')
  debugStructure() {
    return this.negociosService.debugStructure();
  }

  // ===== FUNCIÓN AUXILIAR =====
  private agregarUltimoMovimiento(negocio: Negocio): any {
    const negocioObj: any = { ...negocio };
    
    let ultimoMovimiento = 'Sin información';
    
    if (negocio.fecha_baja && negocio.usuario_baja) {
      ultimoMovimiento = `${negocio.usuario_baja} - BAJA - ${this.formatearFechaArgentina(negocio.fecha_baja)}`;
    } 
    else if (negocio.fecha_modificacion && 
             negocio.fecha_alta && 
             new Date(negocio.fecha_modificacion).getTime() !== new Date(negocio.fecha_alta).getTime() && 
             negocio.usuario_modificacion) {
      ultimoMovimiento = `${negocio.usuario_modificacion} - MODIFICACIÓN - ${this.formatearFechaArgentina(negocio.fecha_modificacion)}`;
    } 
    else if (negocio.usuario_alta) {
      ultimoMovimiento = `${negocio.usuario_alta} - ALTA - ${this.formatearFechaArgentina(negocio.fecha_alta)}`;
    }
    
    negocioObj.ultimoMovimiento = ultimoMovimiento;
    
    return negocioObj;
  }

  private formatearFechaArgentina(fecha: Date): string {
    return new Date(fecha).toLocaleString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).replace(',', '');
  }
}
