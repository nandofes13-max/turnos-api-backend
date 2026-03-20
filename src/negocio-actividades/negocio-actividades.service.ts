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
  async findAll(): Promise<NegocioActividad[]> {
    return this.repository.find({
      relations: ['negocio', 'actividad'],
    });
  }

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

  async findByNegocio(negocioId: number): Promise<NegocioActividad[]> {
    return this.repository.find({
      where: { negocioId, fecha_baja: IsNull() },
      relations: ['actividad'],
    });
  }

  async findByActividad(actividadId: number): Promise<NegocioActividad[]> {
    return this.repository.find({
      where: { actividadId, fecha_baja: IsNull() },
      relations: ['negocio'],
    });
  }

  // Crear o reactivar una relación
  async create(createDto: CreateNegocioActividadDto, usuario?: string): Promise<NegocioActividad> {
    // Validar que existan las entidades relacionadas (solo activas)
    await this.validarNegocio(createDto.negocioId);
    await this.validarActividad(createDto.actividadId);

    // Buscar si ya existe una relación (activa o inactiva)
    const existente = await this.repository.findOneBy({
      negocioId: createDto.negocioId,
      actividadId: createDto.actividadId,
    });

    if (existente) {
      if (existente.fecha_baja) {
        // Reactivar la relación inactiva
        existente.fecha_baja = null;
        existente.usuario_baja = null;
        existente.usuario_modificacion = usuario || 'demo';
        return this.repository.save(existente);
      } else {
        throw new BadRequestException('Esta actividad ya está asignada activamente a este negocio');
      }
    }

    // Crear nueva relación
    const relacion = this.repository.create({
      ...createDto,
      usuario_alta: usuario || 'demo',
    });

    return this.repository.save(relacion);
  }

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

  async reactivar(id: number, usuario?: string): Promise<NegocioActividad> {
    const relacion = await this.findOne(id);
    
    if (!relacion.fecha_baja) {
      throw new BadRequestException('La relación ya está activa');
    }

    relacion.fecha_baja = null;
    relacion.usuario_baja = null;
    relacion.usuario_modificacion = usuario || 'demo';

    return this.repository.save(relacion);
  }

  async softDelete(id: number, usuario?: string): Promise<void> {
    const relacion = await this.findOne(id);

    if (relacion.fecha_baja) {
      throw new BadRequestException('La relación ya está inactiva');
    }

    relacion.fecha_baja = new Date();
    relacion.usuario_baja = usuario || 'demo';

    await this.repository.save(relacion);
  }

  async debugStructure(): Promise<any> {
    return this.repository.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'negocio_actividades';
    `);
  }
}
