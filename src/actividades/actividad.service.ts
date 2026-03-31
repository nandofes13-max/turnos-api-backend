// src/actividades/actividad.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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

  // ===== FUNCIÓN AUXILIAR =====
  private async verificarNombreUnico(nombre: string, id?: number): Promise<void> {
    const existente = await this.actividadRepository.findOne({
      where: { nombre: nombre.toUpperCase() },
    });

    if (existente && existente.id !== id) {
      throw new BadRequestException(`Ya existe una actividad con el nombre "${nombre}"`);
    }
  }

  // ===== CRUD =====
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

  // Crear actividad
  async create(createActividadDto: CreateActividadDto, usuario?: string): Promise<Actividad> {
    // Validar que el nombre no exista (activo o inactivo)
    await this.verificarNombreUnico(createActividadDto.nombre);

    const actividad = this.actividadRepository.create({
      ...createActividadDto,
      nombre: createActividadDto.nombre.toUpperCase(),
      virtual: createActividadDto.virtual || false, // 👈 CAMPO NUEVO
      usuario_alta: usuario || 'demo',
    });

    return this.actividadRepository.save(actividad);
  }

  // Actualizar actividad (incluye reactivación)
  async update(id: number, updateActividadDto: UpdateActividadDto, usuario?: string): Promise<Actividad> {
    const actividad = await this.findOne(id);

    // Si se está actualizando el nombre, verificar que no exista otro con ese nombre
    if (updateActividadDto.nombre) {
      await this.verificarNombreUnico(updateActividadDto.nombre, id);
      updateActividadDto.nombre = updateActividadDto.nombre.toUpperCase();
    }

    // Si se reactiva (fecha_baja viene como null)
    if (updateActividadDto.fecha_baja === null) {
      (actividad as any).fecha_baja = null;
      (actividad as any).usuario_baja = null;
    } else {
      Object.assign(actividad, updateActividadDto);
    }
    
    actividad.usuario_modificacion = usuario || 'demo';

    return this.actividadRepository.save(actividad);
  }

  // Soft delete
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
