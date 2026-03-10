// src/usuarios/usuarios.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from './entities/usuario.entity';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import * as dns from 'dns';
import { promisify } from 'util';

const resolveMx = promisify(dns.resolveMx);

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
  ) {}

  // ===== VALIDACIÓN MX =====
  private async validarMX(email: string): Promise<boolean> {
    const dominio = email.split('@')[1];
    
    try {
      const mxRecords = await resolveMx(dominio);
      return mxRecords && mxRecords.length > 0;
    } catch (error) {
      return false; // El dominio no existe o no tiene MX
    }
  }

  // Obtener todos los usuarios
  async findAll(): Promise<Usuario[]> {
    return this.usuariosRepository.find();
  }

  // Obtener un usuario por ID
  async findOne(id: number): Promise<Usuario> {
    const usuario = await this.usuariosRepository.findOneBy({ id });

    if (!usuario) {
      throw new NotFoundException(`Usuario con id ${id} no encontrado`);
    }

    return usuario;
  }

  // Obtener un usuario por email (útil para login)
  async findByEmail(email: string): Promise<Usuario | null> {
    return this.usuariosRepository.findOneBy({ email: email.toLowerCase() });
  }

  // Crear usuario con auditoría
  async create(createUsuarioDto: CreateUsuarioDto, usuario?: string): Promise<Usuario> {
    // Validar MX records del dominio
    const dominioValido = await this.validarMX(createUsuarioDto.email);
    if (!dominioValido) {
      throw new BadRequestException('El dominio del email no existe o no puede recibir correos');
    }

    // Convertir email a minúsculas
    const emailLower = createUsuarioDto.email.toLowerCase();
    
    // Verificar si ya existe un usuario activo con ese email
    const existente = await this.usuariosRepository.findOneBy({ 
      email: emailLower,
      fecha_baja: null 
    });
    
    if (existente) {
      throw new BadRequestException('Ya existe un usuario activo con ese email');
    }

    const usuarioEntity = this.usuariosRepository.create({
      ...createUsuarioDto,
      email: emailLower,
      apellido: createUsuarioDto.apellido.toUpperCase(),
      nombre: createUsuarioDto.nombre.toUpperCase(),
      usuario_alta: usuario || 'demo',
    });

    return this.usuariosRepository.save(usuarioEntity);
  }

  // Actualizar usuario con auditoría
  async update(id: number, updateUsuarioDto: UpdateUsuarioDto, usuario?: string): Promise<Usuario> {
    const usuarioExistente = await this.findOne(id);

    // Si se actualiza el email, validar MX
    if (updateUsuarioDto.email) {
      const dominioValido = await this.validarMX(updateUsuarioDto.email);
      if (!dominioValido) {
        throw new BadRequestException('El dominio del email no existe o no puede recibir correos');
      }
      updateUsuarioDto.email = updateUsuarioDto.email.toLowerCase();
    }

    // Si se actualiza apellido o nombre, pasarlos a mayúsculas
    if (updateUsuarioDto.apellido) {
      updateUsuarioDto.apellido = updateUsuarioDto.apellido.toUpperCase();
    }
    if (updateUsuarioDto.nombre) {
      updateUsuarioDto.nombre = updateUsuarioDto.nombre.toUpperCase();
    }

    Object.assign(usuarioExistente, updateUsuarioDto);
    usuarioExistente.usuario_modificacion = usuario || 'demo';

    return this.usuariosRepository.save(usuarioExistente);
  }

  // Soft delete con auditoría
  async softDelete(id: number, usuario?: string): Promise<void> {
    const usuarioExistente = await this.findOne(id);
    usuarioExistente.fecha_baja = new Date();
    usuarioExistente.usuario_baja = usuario || 'demo';

    await this.usuariosRepository.save(usuarioExistente);
  }

  // Debug de estructura de tabla
  async debugStructure(): Promise<any> {
    return this.usuariosRepository.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'usuario'
         OR table_name = 'usuarios';
    `);
  }
}
