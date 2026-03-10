// src/usuarios/usuarios.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from './entities/usuario.entity';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
  ) {}

  // Obtener todos los usuarios
  async findAll(): Promise<Usuario[]> {
    return this.usuariosRepository.find();
  }

  // Obtener un usuario por ID
  async findOne(id: number): Promise<Usuario> {
    const usuario = await this.usuariosRepository.findOneBy({ id });

    if (!usuario) {
      throw new NotFoundException(`Usuario with id ${id} not found`);
    }

    return usuario;
  }

  // Obtener un usuario por email (útil para login)
  async findByEmail(email: string): Promise<Usuario | null> {
    return this.usuariosRepository.findOneBy({ email: email.toLowerCase() });
  }

  // Crear usuario con auditoría
  async create(createUsuarioDto: CreateUsuarioDto, usuario?: string): Promise<Usuario> {
    // Convertir email a minúsculas
    const emailLower = createUsuarioDto.email.toLowerCase();
    
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

    // Si se actualiza el email, pasarlo a minúsculas
    if (updateUsuarioDto.email) {
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
