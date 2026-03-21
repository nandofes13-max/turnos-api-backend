// src/especialidades/especialidades.controller.ts
import { Body, Controller, Get, Param, Post, Put, Delete } from '@nestjs/common';
import { EspecialidadesService } from './especialidades.service';
import { Especialidad } from './entities/especialidad.entity';
import { CreateEspecialidadDto } from './dto/create-especialidad.dto';
import { UpdateEspecialidadDto } from './dto/update-especialidad.dto';

@Controller('especialidades')
export class EspecialidadesController {
  constructor(private readonly service: EspecialidadesService) {}

  // Listar todas las especialidades
  @Get()
  async findAll(): Promise<any[]> {
    const especialidades = await this.service.findAll();
    return especialidades.map(e => this.agregarUltimoMovimiento(e));
  }

  // Obtener una especialidad por ID
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<any> {
    const especialidad = await this.service.findOne(Number(id));
    return this.agregarUltimoMovimiento(especialidad);
  }

  // Crear nueva especialidad
  @Post()
  async create(@Body() createDto: CreateEspecialidadDto): Promise<any> {
    const especialidad = await this.service.create(createDto, 'demo');
    return this.agregarUltimoMovimiento(especialidad);
  }

  // Actualizar especialidad
  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDto: UpdateEspecialidadDto): Promise<any> {
    const especialidad = await this.service.update(Number(id), updateDto, 'demo');
    return this.agregarUltimoMovimiento(especialidad);
  }

  // Soft delete
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
  private agregarUltimoMovimiento(especialidad: Especialidad): any {
    const obj: any = { ...especialidad };
    
    let ultimoMovimiento = 'Sin información';
    
    if (especialidad.fecha_baja && especialidad.usuario_baja) {
      ultimoMovimiento = `${especialidad.usuario_baja} - BAJA - ${this.formatearFechaArgentina(especialidad.fecha_baja)}`;
    } 
    else if (especialidad.fecha_modificacion && 
             especialidad.fecha_alta && 
             new Date(especialidad.fecha_modificacion).getTime() !== new Date(especialidad.fecha_alta).getTime() && 
             especialidad.usuario_modificacion) {
      ultimoMovimiento = `${especialidad.usuario_modificacion} - MODIFICACIÓN - ${this.formatearFechaArgentina(especialidad.fecha_modificacion)}`;
    } 
    else if (especialidad.usuario_alta) {
      ultimoMovimiento = `${especialidad.usuario_alta} - ALTA - ${this.formatearFechaArgentina(especialidad.fecha_alta)}`;
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
