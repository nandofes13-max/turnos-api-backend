// src/roles/roles.controller.ts
import { Body, Controller, Get, Param, Post, Put, Delete } from '@nestjs/common';
import { RolesService } from './roles.service';
import { Rol } from './entities/rol.entity';
import { CreateRolDto } from './dto/create-rol.dto';
import { UpdateRolDto } from './dto/update-rol.dto';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  // Listar todos los roles con último movimiento calculado
  @Get()
  async findAll(): Promise<any[]> {
    const roles = await this.rolesService.findAll();
    return roles.map(rol => this.agregarUltimoMovimiento(rol));
  }

  // Obtener un rol por ID con último movimiento calculado
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<any> {
    const rol = await this.rolesService.findOne(Number(id));
    return this.agregarUltimoMovimiento(rol);
  }

  // Obtener un rol por nombre
  @Get('nombre/:nombre')
  async findByNombre(@Param('nombre') nombre: string): Promise<any> {
    const rol = await this.rolesService.findByNombre(nombre);
    if (!rol) {
      return { message: 'Rol no encontrado' };
    }
    return this.agregarUltimoMovimiento(rol);
  }

  // Crear nuevo rol
  @Post()
  async create(@Body() createRolDto: CreateRolDto): Promise<any> {
    const rol = await this.rolesService.create(createRolDto, 'demo');
    return this.agregarUltimoMovimiento(rol);
  }

  // Actualizar rol existente
  @Put(':id')
  async update(@Param('id') id: string, @Body() updateRolDto: UpdateRolDto): Promise<any> {
    const rol = await this.rolesService.update(Number(id), updateRolDto, 'demo');
    return this.agregarUltimoMovimiento(rol);
  }

  // Soft delete de un rol
  @Delete(':id')
  softDelete(@Param('id') id: string): Promise<void> {
    return this.rolesService.softDelete(Number(id), 'demo');
  }

  // Debug: ver estructura de tabla
  @Get('debug/structure')
  debugStructure() {
    return this.rolesService.debugStructure();
  }

  // ===== FUNCIÓN AUXILIAR =====
  private agregarUltimoMovimiento(rol: Rol): any {
    const rolObj: any = { ...rol };
    
    let ultimoMovimiento = 'Sin información';
    
    if (rol.fecha_baja && rol.usuario_baja) {
      ultimoMovimiento = `${rol.usuario_baja} - BAJA - ${this.formatearFechaArgentina(rol.fecha_baja)}`;
    } 
    else if (rol.fecha_modificacion && 
             rol.fecha_alta && 
             new Date(rol.fecha_modificacion).getTime() !== new Date(rol.fecha_alta).getTime() && 
             rol.usuario_modificacion) {
      ultimoMovimiento = `${rol.usuario_modificacion} - MODIFICACIÓN - ${this.formatearFechaArgentina(rol.fecha_modificacion)}`;
    } 
    else if (rol.usuario_alta) {
      ultimoMovimiento = `${rol.usuario_alta} - ALTA - ${this.formatearFechaArgentina(rol.fecha_alta)}`;
    }
    
    rolObj.ultimoMovimiento = ultimoMovimiento;
    
    return rolObj;
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
