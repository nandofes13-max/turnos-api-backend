// src/actividades/actividad.controller.ts
import { Body, Controller, Get, Param, Post, Put, Delete } from '@nestjs/common';
import { ActividadService } from './actividad.service';
import { Actividad } from './entities/actividad.entity';
import { CreateActividadDto } from './dto/create-actividad.dto';
import { UpdateActividadDto } from './dto/update-actividad.dto';

@Controller('actividades')
export class ActividadController {
  constructor(private readonly actividadService: ActividadService) {}

  // Listar todas las actividades de un negocio
  @Get('negocio/:negocioId')
  async findAll(@Param('negocioId') negocioId: string): Promise<any[]> {
    const actividades = await this.actividadService.findAll(Number(negocioId));
    return actividades.map(actividad => this.agregarUltimoMovimiento(actividad));
  }

  // Obtener una actividad por ID (requiere negocioId para verificar pertenencia)
  @Get(':id/negocio/:negocioId')
  async findOne(
    @Param('id') id: string,
    @Param('negocioId') negocioId: string
  ): Promise<any> {
    const actividad = await this.actividadService.findOne(Number(id), Number(negocioId));
    return this.agregarUltimoMovimiento(actividad);
  }

  // Crear nueva actividad (el DTO ya incluye negocioId)
  @Post()
  async create(@Body() createActividadDto: CreateActividadDto): Promise<any> {
    const actividad = await this.actividadService.create(createActividadDto, 'demo');
    return this.agregarUltimoMovimiento(actividad);
  }

  // Actualizar actividad existente
  @Put(':id/negocio/:negocioId')
  async update(
    @Param('id') id: string,
    @Param('negocioId') negocioId: string,
    @Body() updateActividadDto: UpdateActividadDto
  ): Promise<any> {
    // Asegurar que el DTO tenga el negocioId correcto
    updateActividadDto.negocioId = Number(negocioId);
    const actividad = await this.actividadService.update(Number(id), updateActividadDto, 'demo');
    return this.agregarUltimoMovimiento(actividad);
  }

  // Soft delete
  @Delete(':id/negocio/:negocioId')
  softDelete(
    @Param('id') id: string,
    @Param('negocioId') negocioId: string
  ): Promise<void> {
    return this.actividadService.softDelete(Number(id), Number(negocioId), 'demo');
  }

  // Debug: ver estructura de tabla (opcional)
  @Get('debug/structure')
  debugStructure() {
    return this.actividadService.debugStructure();
  }

  // ===== FUNCIÓN AUXILIAR =====
  private agregarUltimoMovimiento(actividad: Actividad): any {
    const actividadObj: any = { ...actividad };
    
    let ultimoMovimiento = 'Sin información';
    
    if (actividad.fecha_baja && actividad.usuario_baja) {
      ultimoMovimiento = `${actividad.usuario_baja} - BAJA - ${this.formatearFechaArgentina(actividad.fecha_baja)}`;
    } 
    else if (actividad.fecha_modificacion && 
             actividad.fecha_alta && 
             new Date(actividad.fecha_modificacion).getTime() !== new Date(actividad.fecha_alta).getTime() && 
             actividad.usuario_modificacion) {
      ultimoMovimiento = `${actividad.usuario_modificacion} - MODIFICACIÓN - ${this.formatearFechaArgentina(actividad.fecha_modificacion)}`;
    } 
    else if (actividad.usuario_alta) {
      ultimoMovimiento = `${actividad.usuario_alta} - ALTA - ${this.formatearFechaArgentina(actividad.fecha_alta)}`;
    }
    
    actividadObj.ultimoMovimiento = ultimoMovimiento;
    
    return actividadObj;
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
