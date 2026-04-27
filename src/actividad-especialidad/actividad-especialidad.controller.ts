// src/actividad-especialidad/actividad-especialidad.controller.ts
import { Body, Controller, Get, Param, Post, Put, Delete, Query } from '@nestjs/common';
import { ActividadEspecialidadService } from './actividad-especialidad.service';
import { ActividadEspecialidad } from './entities/actividad-especialidad.entity';
import { CreateActividadEspecialidadDto } from './dto/create-actividad-especialidad.dto';
import { UpdateActividadEspecialidadDto } from './dto/update-actividad-especialidad.dto';

@Controller('actividad-especialidad')
export class ActividadEspecialidadController {
  constructor(private readonly service: ActividadEspecialidadService) {}

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

  // Obtener relaciones por actividad
  @Get('por-actividad/:actividadId')
  async findByActividad(@Param('actividadId') actividadId: string): Promise<any[]> {
    const relaciones = await this.service.findByActividad(Number(actividadId));
    return relaciones.map(r => this.agregarUltimoMovimiento(r));
  }

  // Obtener relaciones por especialidad
  @Get('por-especialidad/:especialidadId')
  async findByEspecialidad(@Param('especialidadId') especialidadId: string): Promise<any[]> {
    const relaciones = await this.service.findByEspecialidad(Number(especialidadId));
    return relaciones.map(r => this.agregarUltimoMovimiento(r));
  }

  // ============================================================
  // NUEVO ENDPOINT: Obtener especialidades por negocio y actividad
  // ============================================================
  @Get('especialidades-por-negocio-actividad')
  async getEspecialidadesPorNegocioYActividad(
    @Query('negocioId') negocioId: string,
    @Query('actividadId') actividadId: string,
  ): Promise<any[]> {
    console.log(`[Controller] especialidades-por-negocio-actividad - negocioId: ${negocioId}, actividadId: ${actividadId}`);
    return this.service.findEspecialidadesPorNegocioYActividadSimple(
      Number(negocioId),
      Number(actividadId),
    );
  }

  // Crear nueva relación
  @Post()
  async create(@Body() createDto: CreateActividadEspecialidadDto): Promise<any> {
    const relacion = await this.service.create(createDto, 'demo');
    return this.agregarUltimoMovimiento(relacion);
  }

  // Actualizar una relación
  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDto: UpdateActividadEspecialidadDto): Promise<any> {
    const relacion = await this.service.update(Number(id), updateDto, 'demo');
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
  private agregarUltimoMovimiento(relacion: ActividadEspecialidad): any {
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
