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
  // MÉTODO OPTIMIZADO: Obtener especialidades por negocio y actividad
  // usando agenda_disponibilidad para filtrar solo las que tienen horarios
  // ============================================================
  async findEspecialidadesPorNegocioYActividad(
    negocioId: number,
    actividadId: number,
  ): Promise<any[]> {
    console.log(`[findEspecialidadesPorNegocioYActividad] Buscando para negocioId: ${negocioId}, actividadId: ${actividadId}`);
    
    // Para el negocio DEMO (id=6), usar la lógica simple (por compatibilidad)
    if (negocioId === 6) {
      console.log('[findEspecialidadesPorNegocioYActividad] Usando lógica simple para DEMO');
      return this.findEspecialidadesPorNegocioYActividadSimple(negocioId, actividadId);
    }
    
    // Verificar que el negocio tenga la actividad
    const negocioActividadQuery = `
      SELECT 1 FROM negocio_actividades 
      WHERE negocio_id = $1 AND actividad_id = $2 AND fecha_baja IS NULL
      LIMIT 1
    `;
    const negocioActividad = await this.repository.query(negocioActividadQuery, [negocioId, actividadId]);
    
    if (negocioActividad.length === 0) {
      console.log('[findEspecialidadesPorNegocioYActividad] El negocio no tiene esta actividad');
      return [];
    }

    // ✅ NUEVA CONSULTA: Especialidades que tienen agenda disponible para este negocio
    const sql = `
      SELECT DISTINCT 
        e.id,
        e.nombre
      FROM especialidad e
      WHERE e.id IN (
        SELECT DISTINCT pc.especialidad_id
        FROM agenda_disponibilidad ad
        JOIN profesional_centro pc ON pc.id = ad.profesional_centro_id
        JOIN centro c ON c.id = pc.centro_id
        WHERE c.negocio_id = $1
          AND ad.fecha_baja IS NULL
          AND pc.fecha_baja IS NULL
          AND c.fecha_baja IS NULL
      )
      AND e.id IN (
        SELECT ae.especialidad_id 
        FROM actividad_especialidad ae
        WHERE ae.actividad_id = $2 AND ae.fecha_baja IS NULL
      )
      ORDER BY e.nombre
    `;
    
    const especialidades = await this.repository.query(sql, [negocioId, actividadId]);
    
    console.log(`[findEspecialidadesPorNegocioYActividad] Encontradas ${especialidades.length} especialidades con agenda`);
    
    // Transformar al formato deseado
    return especialidades.map(esp => ({
      id: esp.id,
      nombre: esp.nombre,
      negocioId: negocioId,
      actividadId: actividadId,
    }));
  }

  // ============================================================
  // MÉTODO SIMPLE (fallback): Solo usa actividad_especialidad
  // ============================================================
  async findEspecialidadesPorNegocioYActividadSimple(
    negocioId: number,
    actividadId: number,
  ): Promise<any[]> {
    console.log(`[DEBUG] Método simple llamado con negocioId: ${negocioId}, actividadId: ${actividadId}`);
    
    // Verificar que el negocio tenga la actividad
    const negocioActividadQuery = `
      SELECT 1 FROM negocio_actividades 
      WHERE negocio_id = $1 AND actividad_id = $2 AND fecha_baja IS NULL
      LIMIT 1
    `;
    const negocioActividad = await this.repository.query(negocioActividadQuery, [negocioId, actividadId]);
    
    if (negocioActividad.length === 0) {
      return [];
    }

    // Obtener las relaciones (actividad-especialidad)
    const relaciones = await this.repository.find({
      where: { actividadId: actividadId, fecha_baja: IsNull() },
      relations: ['especialidad'],
    });

    // Transformar al formato deseado
    return relaciones.map(rel => ({
      id: rel.especialidad.id,
      nombre: rel.especialidad.nombre,
      negocioId: negocioId,
      actividadId: actividadId,
    }));
  }
}
