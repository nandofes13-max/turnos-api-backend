// src/actividad-especialidad/actividad-especialidad.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ActividadEspecialidad } from './entities/actividad-especialidad.entity';
import { CreateActividadEspecialidadDto } from './dto/create-actividad-especialidad.dto';
import { UpdateActividadEspecialidadDto } from './dto/update-actividad-especialidad.dto';
import { Actividad } from '../actividades/entities/actividad.entity';
import { Especialidad } from '../especialidades/entities/especialidad.entity';

@Injectable()
export class ActividadEspecialidadService {
  constructor(
    @InjectRepository(ActividadEspecialidad)
    private readonly repository: Repository<ActividadEspecialidad>,
    @InjectRepository(Actividad)
    private readonly actividadRepository: Repository<Actividad>,
    @InjectRepository(Especialidad)
    private readonly especialidadRepository: Repository<Especialidad>,
  ) {}

  // ===== FUNCIONES AUXILIARES =====
  private async validarActividad(actividadId: number): Promise<void> {
    const actividad = await this.actividadRepository.findOneBy({ 
      id: actividadId,
      fecha_baja: IsNull() 
    });
    if (!actividad) {
      throw new BadRequestException(`La actividad con id ${actividadId} no existe o no está activa`);
    }
  }

  private async validarEspecialidad(especialidadId: number): Promise<void> {
    const especialidad = await this.especialidadRepository.findOneBy({ 
      id: especialidadId,
      fecha_baja: IsNull() 
    });
    if (!especialidad) {
      throw new BadRequestException(`La especialidad con id ${especialidadId} no existe o no está activa`);
    }
  }

  // ===== CRUD =====
  async findAll(): Promise<ActividadEspecialidad[]> {
    return this.repository.find({
      relations: ['actividad', 'especialidad'],
    });
  }

  async findOne(id: number): Promise<ActividadEspecialidad> {
    const relacion = await this.repository.findOne({
      where: { id },
      relations: ['actividad', 'especialidad'],
    });

    if (!relacion) {
      throw new NotFoundException(`Relación con id ${id} no encontrada`);
    }

    return relacion;
  }

  async findByActividad(actividadId: number): Promise<ActividadEspecialidad[]> {
    return this.repository.find({
      where: { actividadId, fecha_baja: IsNull() },
      relations: ['especialidad'],
    });
  }

  async findByEspecialidad(especialidadId: number): Promise<ActividadEspecialidad[]> {
    return this.repository.find({
      where: { especialidadId, fecha_baja: IsNull() },
      relations: ['actividad'],
    });
  }

  async create(createDto: CreateActividadEspecialidadDto, usuario?: string): Promise<ActividadEspecialidad> {
    await this.validarActividad(createDto.actividadId);
    await this.validarEspecialidad(createDto.especialidadId);

    const existente = await this.repository.findOneBy({
      actividadId: createDto.actividadId,
      especialidadId: createDto.especialidadId,
    });

    if (existente) {
      throw new BadRequestException('Esta especialidad ya está vinculada a esta actividad');
    }

    const relacion = this.repository.create({
      ...createDto,
      usuario_alta: usuario || 'demo',
    });

    return this.repository.save(relacion);
  }

  async update(id: number, updateDto: UpdateActividadEspecialidadDto, usuario?: string): Promise<ActividadEspecialidad> {
    const relacion = await this.findOne(id);

    if (updateDto.actividadId && updateDto.actividadId !== relacion.actividadId) {
      await this.validarActividad(updateDto.actividadId);
    }
    if (updateDto.especialidadId && updateDto.especialidadId !== relacion.especialidadId) {
      await this.validarEspecialidad(updateDto.especialidadId);
    }

    Object.assign(relacion, updateDto);
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
      WHERE table_name = 'actividad_especialidad';
    `);
  }

  // ============================================================
  // NUEVO MÉTODO: Obtener especialidades por negocio y actividad
  // ============================================================
async findEspecialidadesPorNegocioYActividad(
  negocioId: number,
  actividadId: number,
): Promise<any[]> {
  try {
    console.log(`[DEBUG] INICIO - negocioId: ${negocioId}, actividadId: ${actividadId}`);
    
    // Consulta SQL súper simple
    const sql = `
      SELECT e.id, e.nombre
      FROM especialidad e
      WHERE e.id IN (
        SELECT ae.especialidad_id 
        FROM actividad_especialidad ae
        WHERE ae.actividad_id = $1
          AND ae.fecha_baja IS NULL
      )
      AND e.fecha_baja IS NULL
      ORDER BY e.nombre ASC
    `;
    
    const results = await this.repository.query(sql, [actividadId]);
    console.log(`[DEBUG] Resultados: ${JSON.stringify(results)}`);
    
    // Agregar negocioId y actividadId manualmente
    const resultadosFinales = results.map((r: any) => ({
      id: r.id,
      nombre: r.nombre,
      negocioId: negocioId,
      actividadId: actividadId,
    }));
    
    return resultadosFinales;
  } catch (error) {
    console.error('[DEBUG] ERROR:', error);
    throw new BadRequestException(`Error: ${error.message}`);
  }
}
}
