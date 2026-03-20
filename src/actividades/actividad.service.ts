// src/actividades/actividad.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Actividad } from './entities/actividad.entity';
import { CreateActividadDto } from './dto/create-actividad.dto';
import { UpdateActividadDto } from './dto/update-actividad.dto';

@Injectable()
export class ActividadService {
  constructor(
    @InjectRepository(Actividad)
    private readonly actividadRepository: Repository<Actividad>,
  ) {}

  // Obtener todas las actividades
  async findAll(): Promise<Actividad[]> {
    return this.actividadRepository.find();
  }

  // Obtener una actividad por ID
  async findOne(id: number): Promise<Actividad> {
    const actividad = await this.actividadRepository.findOneBy({ id });

    if (!actividad) {
      throw new NotFoundException(`Actividad con id ${id} no encontrada`);
    }

    return actividad;
  }

  // Crear actividad con auditoría
  async create(createActividadDto: CreateActividadDto, usuario?: string): Promise<Actividad> {
    const actividad = this.actividadRepository.create({
      ...createActividadDto,
      usuario_alta: usuario || 'demo',
    });

    return this.actividadRepository.save(actividad);
  }

  // Actualizar actividad con auditoría (incluye reactivación)
  async update(id: number, updateActividadDto: UpdateActividadDto, usuario?: string): Promise<Actividad> {
    const actividad = await this.findOne(id);

    // Si se reactiva (fecha_baja viene como null)
    if (updateActividadDto.fecha_baja === null) {
      actividad.fecha_baja = null;
      actividad.usuario_baja = null;
    } else {
      // Actualización normal de otros campos
      Object.assign(actividad, updateActividadDto);
    }
    
    actividad.usuario_modificacion = usuario || 'demo';

    return this.actividadRepository.save(actividad);
  }

  // Soft delete con auditoría
  async softDelete(id: number, usuario?: string): Promise<void> {
    const actividad = await this.findOne(id);
    actividad.fecha_baja = new Date();
    actividad.usuario_baja = usuario || 'demo';

    await this.actividadRepository.save(actividad);
  }

  // Debug de estructura de tabla
  async debugStructure(): Promise<any> {
    return this.actividadRepository.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'actividad';
    `);
  }
}
