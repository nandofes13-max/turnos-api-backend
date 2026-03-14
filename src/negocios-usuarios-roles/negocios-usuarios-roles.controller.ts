// src/negocios-usuarios-roles/negocios-usuarios-roles.controller.ts
import { Body, Controller, Get, Param, Post, Put, Delete } from '@nestjs/common';
import { NegociosUsuariosRolesService } from './negocios-usuarios-roles.service';
import { NegocioUsuarioRol } from './entities/negocio-usuario-rol.entity';
import { CreateNegocioUsuarioRolDto } from './dto/create-negocio-usuario-rol.dto';
import { UpdateNegocioUsuarioRolDto } from './dto/update-negocio-usuario-rol.dto';

@Controller('negocios-usuarios-roles')
export class NegociosUsuariosRolesController {
  constructor(private readonly service: NegociosUsuariosRolesService) {}

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

  // Obtener relaciones por usuario
  @Get('usuario/:usuarioId')
  async findByUsuario(@Param('usuarioId') usuarioId: string): Promise<any[]> {
    const relaciones = await this.service.findByUsuario(Number(usuarioId));
    return relaciones.map(r => this.agregarUltimoMovimiento(r));
  }

  // Obtener el rol de un usuario en un negocio específico
  @Get('usuario/:usuarioId/negocio/:negocioId')
  async findRolEnNegocio(
    @Param('usuarioId') usuarioId: string,
    @Param('negocioId') negocioId: string
  ): Promise<any> {
    const relacion = await this.service.findRolEnNegocio(Number(usuarioId), Number(negocioId));
    if (!relacion) {
      return { message: 'No hay relación activa entre el usuario y el negocio' };
    }
    return this.agregarUltimoMovimiento(relacion);
  }

  // Crear nueva relación
  @Post()
  async create(@Body() createDto: CreateNegocioUsuarioRolDto): Promise<any> {
    const relacion = await this.service.create(createDto, 'demo');
    return this.agregarUltimoMovimiento(relacion);
  }

  // Actualizar una relación
  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDto: UpdateNegocioUsuarioRolDto): Promise<any> {
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
  private agregarUltimoMovimiento(relacion: NegocioUsuarioRol): any {
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
