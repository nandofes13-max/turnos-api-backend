// src/actividades/actividad.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Actividad } from './entities/actividad.entity';
import { CreateActividadDto } from './dto/create-actividad.dto';
import { UpdateActividadDto } from './dto/update-actividad.dto';
import { Negocio } from '../negocios/entities/negocio.entity'; // 👈 IMPORTAR

@Injectable()
export class ActividadService {
  constructor(
    @InjectRepository(Actividad)
    private readonly actividadRepository: Repository<Actividad>,
    @InjectRepository(Negocio) // 👈 AGREGAR
    private readonly negocioRepository: Repository<Negocio>,
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

  // ===== CRUD =====
  // Obtener todas las actividades de un negocio
  async findAll(negocioId: number): Promise<Actividad[]> {
    return this.actividadRepository.find({
      where: { 
        negocioId,
        fecha_baja: IsNull() 
      },
    });
  }

  // Obtener una actividad por ID (verificando que pertenezca al negocio)
  async findOne(id: number, negocioId: number): Promise<Actividad> {
    const actividad = await this.actividadRepository.findOne({
      where: { 
        id, 
        negocioId,
        fecha_baja: IsNull() 
      },
    });

    if (!actividad) {
      throw new NotFoundException(`Actividad con id ${id} no encontrada para este negocio`);
    }

    return actividad;
  }

  // Crear actividad
  async create(createActividadDto: CreateActividadDto, usuario?: string): Promise<Actividad> {
    // Validar que el negocio exista
    await this.validarNegocio(createActividadDto.negocioId);

    const actividad = this.actividadRepository.create({
      ...createActividadDto,
      usuario_alta: usuario || 'demo',
    });

    return this.actividadRepository.save(actividad);
  }

  // Actualizar actividad
  async update(id: number, updateActividadDto: UpdateActividadDto, usuario?: string): Promise<Actividad> {
    const actividad = await this.findOne(id, updateActividadDto.negocioId);

    // Si se actualiza el negocioId, validar que el nuevo exista
    if (updateActividadDto.negocioId && updateActividadDto.negocioId !== actividad.negocioId) {
      await this.validarNegocio(updateActividadDto.negocioId);
    }

    Object.assign(actividad, updateActividadDto);
    actividad.usuario_modificacion = usuario || 'demo';

    return this.actividadRepository.save(actividad);
  }

  // Soft delete
  async softDelete(id: number, negocioId: number, usuario?: string): Promise<void> {
    const actividad = await this.findOne(id, negocioId);
    actividad.fecha_baja = new Date();
    actividad.usuario_baja = usuario || 'demo';

    await this.actividadRepository.save(actividad);
  }

  // Debug (opcional, mantener solo para desarrollo)
  async debugStructure(): Promise<any> {
    return this.actividadRepository.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'actividad';
    `);
  }
}
