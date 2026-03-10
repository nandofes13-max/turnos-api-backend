// src/usuarios/usuarios.controller.ts
import { Body, Controller, Get, Param, Post, Put, Delete } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { Usuario } from './entities/usuario.entity';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  // Listar todos los usuarios con último movimiento calculado
  @Get()
  async findAll(): Promise<any[]> {
    const usuarios = await this.usuariosService.findAll();
    return usuarios.map(usuario => this.agregarUltimoMovimiento(usuario));
  }

  // Obtener un usuario por ID con último movimiento calculado
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<any> {
    const usuario = await this.usuariosService.findOne(Number(id));
    return this.agregarUltimoMovimiento(usuario);
  }

  // Obtener un usuario por email
  @Get('email/:email')
  async findByEmail(@Param('email') email: string): Promise<any> {
    const usuario = await this.usuariosService.findByEmail(email);
    if (!usuario) {
      return { message: 'Usuario no encontrado' };
    }
    return this.agregarUltimoMovimiento(usuario);
  }

  // Crear nuevo usuario
  @Post()
  async create(@Body() createUsuarioDto: CreateUsuarioDto): Promise<any> {
    // Para demo, usuario por defecto "demo"
    const usuario = await this.usuariosService.create(createUsuarioDto, 'demo');
    return this.agregarUltimoMovimiento(usuario);
  }

  // Actualizar usuario existente
  @Put(':id')
  async update(@Param('id') id: string, @Body() updateUsuarioDto: UpdateUsuarioDto): Promise<any> {
    const usuario = await this.usuariosService.update(Number(id), updateUsuarioDto, 'demo');
    return this.agregarUltimoMovimiento(usuario);
  }

  // Soft delete de un usuario
  @Delete(':id')
  softDelete(@Param('id') id: string): Promise<void> {
    return this.usuariosService.softDelete(Number(id), 'demo');
  }

  // Debug: ver estructura de tabla
  @Get('debug/structure')
  debugStructure() {
    return this.usuariosService.debugStructure();
  }

  // ===== FUNCIÓN AUXILIAR =====
  private agregarUltimoMovimiento(usuario: Usuario): any {
    const usuarioObj: any = { ...usuario };
    
    let ultimoMovimiento = 'Sin información';
    
    if (usuario.fecha_baja && usuario.usuario_baja) {
      ultimoMovimiento = `${usuario.usuario_baja} - BAJA - ${this.formatearFechaArgentina(usuario.fecha_baja)}`;
    } 
    else if (usuario.fecha_modificacion && 
             usuario.fecha_alta && 
             new Date(usuario.fecha_modificacion).getTime() !== new Date(usuario.fecha_alta).getTime() && 
             usuario.usuario_modificacion) {
      ultimoMovimiento = `${usuario.usuario_modificacion} - MODIFICACIÓN - ${this.formatearFechaArgentina(usuario.fecha_modificacion)}`;
    } 
    else if (usuario.usuario_alta) {
      ultimoMovimiento = `${usuario.usuario_alta} - ALTA - ${this.formatearFechaArgentina(usuario.fecha_alta)}`;
    }
    
    usuarioObj.ultimoMovimiento = ultimoMovimiento;
    
    return usuarioObj;
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
