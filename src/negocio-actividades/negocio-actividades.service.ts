// src/negocio-actividades/negocio-actividades.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { NegocioActividad } from './entities/negocio-actividad.entity';
import { CreateNegocioActividadDto } from './dto/create-negocio-actividad.dto';
import { UpdateNegocioActividadDto } from './dto/update-negocio-actividad.dto';
import { Negocio } from '../negocios/entities/negocio.entity';
import { Actividad } from '../actividades/entities/actividad.entity';

@Injectable()
export class NegocioActividadesService {
  constructor(
    @InjectRepository(NegocioActividad)
    private readonly repository: Repository<NegocioActividad>,
    @InjectRepository(Negocio)
    private readonly negocioRepository: Repository<Negocio>,
    @InjectRepository(Actividad)
    private readonly actividadRepository: Repository<Actividad>,
  ) {}

  // ===== FUNCIONES AUXILIARES =====
  private async validarNegocio(negocioId: number): Promise<void> {
    const negocio = await this.negocioRepository.findOneBy({ 
      id: negocioId,
      fecha_baja: IsNull() 
    });
    if (!negocio) {
      throw new BadRequestException(`El negocio con id ${negocioId} no existe o no está activo`);
    }
  }

  private async validarActividad(actividadId: number): Promise<void> {
    const actividad = await this.actividadRepository.findOneBy({ 
      id: actividadId,
      fecha_baja: IsNull() 
    });
    if (!actividad) {
      throw new BadRequestException(`La actividad con id ${actividadId} no existe o no está activa`);
    }
  }

  // ===== CRUD =====
  // Obtener todas las relaciones
  async findAll(): Promise<NegocioActividad[]> {
    return this.repository.find({
      relations: ['negocio', 'actividad'],
    });
  }

  // Obtener una relación por ID
  async findOne(id: number): Promise<NegocioActividad> {
    const relacion = await this.repository.findOne({
      where: { id },
      relations: ['negocio', 'actividad'],
    });

    if (!relacion) {
      throw new NotFoundException(`Relación con id ${id} no encontrada`);
    }

    return relacion;
  }

  // Obtener relaciones por negocio (solo activas)
  async findByNegocio(negocioId: number): Promise<NegocioActividad[]> {
    return this.repository.find({
      where: { negocioId, fecha_baja: IsNull() },
      relations: ['actividad'],
    });
  }

  // Obtener relaciones por actividad (solo activas)
  async findByActividad(actividadId: number): Promise<NegocioActividad[]> {
    return this.repository.find({
      where: { actividadId, fecha_baja: IsNull() },
      relations: ['negocio'],
    });
  }

  // Crear una nueva relación
  async create(createDto: CreateNegocioActividadDto, usuario?: string): Promise<NegocioActividad> {
    // Validar que existan las entidades relacionadas (solo activas)
    await this.validarNegocio(createDto.negocioId);
    await this.validarActividad(createDto.actividadId);

    // Verificar que no exista ya una relación activa
    const existente = await this.repository.findOneBy({
      negocioId: createDto.negocioId,
      actividadId: createDto.actividadId,
      fecha_baja: IsNull(),
    });

    if (existente) {
      throw new BadRequestException('Esta actividad ya está asignada a este negocio');
    }

    const relacion = this.repository.create({
      ...createDto,
      usuario_alta: usuario || 'demo',
    });

    return this.repository.save(relacion);
  }

  // Actualizar una relación (solo cambiar negocio o actividad)
  async update(id: number, updateDto: UpdateNegocioActividadDto, usuario?: string): Promise<NegocioActividad> {
    const relacion = await this.findOne(id);

    // Si se cambia negocio o actividad, validar
    if (updateDto.negocioId && updateDto.negocioId !== relacion.negocioId) {
      await this.validarNegocio(updateDto.negocioId);
    }
    if (updateDto.actividadId && updateDto.actividadId !== relacion.actividadId) {
      await this.validarActividad(updateDto.actividadId);
    }

    Object.assign(relacion, updateDto);
    relacion.usuario_modificacion = usuario || 'demo';

    return this.repository.save(relacion);
  }

  // Reactivar una relación inactiva
  async reactivar(id: number, usuario?: string): Promise<NegocioActividad> {
    const relacion = await this.findOne(id);
    
    if (!relacion.fecha_baja) {
      throw new BadRequestException('La relación ya está activa');
    }

    // Verificar que no exista otra relación activa con el mismo par
    const existente = await this.repository.findOneBy({
      negocioId: relacion.negocioId,
      actividadId: relacion.actividadId,
      fecha_baja: IsNull(),
    });

    if (existente && existente.id !== id) {
      throw new BadRequestException('Ya existe una relación activa para este negocio y actividad');
    }

    relacion.fecha_baja = null;
    relacion.usuario_baja = null;
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
      WHERE table_name = 'negocio_actividades';
    `);
  }
}
