// src/negocio-actividades/negocio-actividades.controller.ts
import { Body, Controller, Get, Param, Post, Put, Delete } from '@nestjs/common';
import { NegocioActividadesService } from './negocio-actividades.service';
import { NegocioActividad } from './entities/negocio-actividad.entity';
import { CreateNegocioActividadDto } from './dto/create-negocio-actividad.dto';
import { UpdateNegocioActividadDto } from './dto/update-negocio-actividad.dto';

@Controller('negocio-actividades')
export class NegocioActividadesController {
  constructor(private readonly service: NegocioActividadesService) {}

  // Listar todas las relaciones
  @Get()
  async findAll(): Promise<any[]> {
    const relaciones = await this.service.findAll();
    return relaciones.map(r => this.agregarUltimoMovimiento(r));
  }

  // Obtener una relación por ID
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<any> {
    const relacion = await this.service.findOne(Number(id));
    return this.agregarUltimoMovimiento(relacion);
  }

  // Obtener relaciones por negocio
  @Get('negocio/:negocioId')
  async findByNegocio(@Param('negocioId') negocioId: string): Promise<any[]> {
    const relaciones = await this.service.findByNegocio(Number(negocioId));
    return relaciones.map(r => this.agregarUltimoMovimiento(r));
  }

  // Obtener relaciones por actividad
  @Get('actividad/:actividadId')
  async findByActividad(@Param('actividadId') actividadId: string): Promise<any[]> {
    const relaciones = await this.service.findByActividad(Number(actividadId));
    return relaciones.map(r => this.agregarUltimoMovimiento(r));
  }

  // NUEVO ENDPOINT: Obtener solo IDs de negocios por actividad (para filtrar en frontend)
  @Get('negocios-por-actividad/:actividadId')
  async getNegocioIdsByActividad(@Param('actividadId') actividadId: string): Promise<{ negocioIds: number[] }> {
    const relaciones = await this.service.findByActividad(Number(actividadId));
    const negocioIds = [...new Set(relaciones.map(r => r.negocioId))];
    return { negocioIds };
  }

  // Crear nueva relación
  @Post()
  async create(@Body() createDto: CreateNegocioActividadDto): Promise<any> {
    const relacion = await this.service.create(createDto, 'demo');
    return this.agregarUltimoMovimiento(relacion);
  }

  // Actualizar una relación (cambiar negocio o actividad)
  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDto: UpdateNegocioActividadDto): Promise<any> {
    const relacion = await this.service.update(Number(id), updateDto, 'demo');
    return this.agregarUltimoMovimiento(relacion);
  }

  // Reactivar una relación inactiva
  @Put('reactivar/:id')
  async reactivar(@Param('id') id: string): Promise<any> {
    const relacion = await this.service.reactivar(Number(id), 'demo');
    return this.agregarUltimoMovimiento(relacion);
  }

  // Soft delete de una relación
  @Delete(':id')
  softDelete(@Param('id') id: string): Promise<void> {
    return this.service.softDelete(Number(id), 'demo');
  }

  // Debug: ver estructura de tabla
  @Get('debug/structure')
  debugStructure() {
    return this.service.debugStructure();
  }

  // ===== FUNCIÓN AUXILIAR =====
  private agregarUltimoMovimiento(relacion: NegocioActividad): any {
    const obj: any = { ...relacion };
    
    let ultimoMovimiento = 'Sin información';
    
    if (relacion.fecha_baja && relacion.usuario_baja) {
      ultimoMovimiento = `${relacion.usuario_baja} - BAJA - ${this.formatearFechaArgentina(relacion.fecha_baja)}`;
    } 
    else if (relacion.fecha_modificacion && 
             relacion.fecha_alta && 
             new Date(relacion.fecha_modificacion).getTime() !== new Date(relacion.fecha_alta).getTime() && 
             relacion.usuario_modificacion) {
      ultimoMovimiento = `${relacion.usuario_modificacion} - MODIFICACIÓN - ${this.formatearFechaArgentina(relacion.fecha_modificacion)}`;
    } 
    else if (relacion.usuario_alta) {
      ultimoMovimiento = `${relacion.usuario_alta} - ALTA - ${this.formatearFechaArgentina(relacion.fecha_alta)}`;
    }
    
    obj.ultimoMovimiento = ultimoMovimiento;
    
    return obj;
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
