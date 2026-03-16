// src/negocios-usuarios-roles/negocios-usuarios-roles.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { NegocioUsuarioRol } from './entities/negocio-usuario-rol.entity';
import { CreateNegocioUsuarioRolDto } from './dto/create-negocio-usuario-rol.dto';
import { UpdateNegocioUsuarioRolDto } from './dto/update-negocio-usuario-rol.dto';
import { Negocio } from '../negocios/entities/negocio.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Rol } from '../roles/entities/rol.entity';

@Injectable()
export class NegociosUsuariosRolesService {
  constructor(
    @InjectRepository(NegocioUsuarioRol)
    private readonly repository: Repository<NegocioUsuarioRol>,
    @InjectRepository(Negocio)
    private readonly negocioRepository: Repository<Negocio>,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(Rol)
    private readonly rolRepository: Repository<Rol>,
  ) {}

  // Obtener todas las relaciones
  async findAll(): Promise<NegocioUsuarioRol[]> {
    return this.repository.find({
      relations: ['negocio', 'usuario', 'rol'],
    });
  }

  // Obtener una relación por ID
  async findOne(id: number): Promise<NegocioUsuarioRol> {
    const relacion = await this.repository.findOne({
      where: { id },
      relations: ['negocio', 'usuario', 'rol'],
    });

    if (!relacion) {
      throw new NotFoundException(`Relación con id ${id} no encontrada`);
    }

    return relacion;
  }

  // Obtener relaciones por negocio (solo activas)
  async findByNegocio(negocioId: number): Promise<NegocioUsuarioRol[]> {
    return this.repository.find({
      where: { negocioId, fecha_baja: IsNull() },
      relations: ['usuario', 'rol'],
    });
  }

  // Obtener relaciones por usuario (solo activas)
  async findByUsuario(usuarioId: number): Promise<NegocioUsuarioRol[]> {
    return this.repository.find({
      where: { usuarioId, fecha_baja: IsNull() },
      relations: ['negocio', 'rol'],
    });
  }

  // Obtener el rol de un usuario en un negocio específico (solo activas)
  async findRolEnNegocio(usuarioId: number, negocioId: number): Promise<NegocioUsuarioRol | null> {
    return this.repository.findOne({
      where: { 
        usuarioId, 
        negocioId, 
        fecha_baja: IsNull() 
      },
      relations: ['rol'],
    });
  }

  // Crear una nueva relación
  async create(createDto: CreateNegocioUsuarioRolDto, usuario?: string): Promise<NegocioUsuarioRol> {
    // Verificar que existan las entidades relacionadas (solo activas)
    const negocio = await this.negocioRepository.findOneBy({ 
      id: createDto.negocioId,
      fecha_baja: IsNull() 
    });
    if (!negocio) {
      throw new BadRequestException(`El negocio con id ${createDto.negocioId} no existe o no está activo`);
    }

    const usuarioExistente = await this.usuarioRepository.findOneBy({ 
      id: createDto.usuarioId,
      fecha_baja: IsNull() 
    });
    if (!usuarioExistente) {
      throw new BadRequestException(`El usuario con id ${createDto.usuarioId} no existe o no está activo`);
    }

    const rol = await this.rolRepository.findOneBy({ 
      id: createDto.rolId,
      fecha_baja: IsNull() 
    });
    if (!rol) {
      throw new BadRequestException(`El rol con id ${createDto.rolId} no existe o no está activo`);
    }

    // Verificar que no exista ya una relación activa
    const existente = await this.repository.findOneBy({
      negocioId: createDto.negocioId,
      usuarioId: createDto.usuarioId,
      fecha_baja: IsNull(),
    });

    if (existente) {
      throw new BadRequestException('El usuario ya tiene una relación activa con este negocio');
    }

    const relacion = this.repository.create({
      ...createDto,
      usuario_alta: usuario || 'demo',
    });

    return this.repository.save(relacion);
  }

  // Actualizar una relación
  async update(id: number, updateDto: UpdateNegocioUsuarioRolDto, usuario?: string): Promise<NegocioUsuarioRol> {
    const relacion = await this.findOne(id);

    // CASO 1: La relación está inactiva y se quiere reactivar
    if (relacion.fecha_baja) {
      // Verificar que no exista otra relación activa con el mismo par (negocio, usuario)
      const existente = await this.repository.findOneBy({
        negocioId: relacion.negocioId,
        usuarioId: relacion.usuarioId,
        fecha_baja: IsNull(),
      });

      if (existente && existente.id !== id) {
        throw new BadRequestException('Ya existe una relación activa para este negocio y usuario');
      }

      // Reactivar
      relacion.fecha_baja = null;
      relacion.usuario_baja = null;
    }

    // Si se actualiza el rol, verificar que exista
    if (updateDto.rolId) {
      const rol = await this.rolRepository.findOneBy({ 
        id: updateDto.rolId,
        fecha_baja: IsNull() 
      });
      if (!rol) {
        throw new BadRequestException(`El rol con id ${updateDto.rolId} no existe o no está activo`);
      }
      relacion.rolId = updateDto.rolId;
    }

    relacion.usuario_modificacion = usuario || 'demo';

    return this.repository.save(relacion);
  }

  // Soft delete (desactivar) una relación
  async softDelete(id: number, usuario?: string): Promise<void> {
    const relacion = await this.findOne(id);

    if (relacion.fecha_baja) {
      throw new BadRequestException('La relación ya está inactiva');
    }

    relacion.fecha_baja = new Date();
    relacion.usuario_baja = usuario || 'demo';

    await this.repository.save(relacion);
  }

  // Debug de estructura de tabla
  async debugStructure(): Promise<any> {
    return this.repository.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'negocios_usuarios_roles';
    `);
  }
}
