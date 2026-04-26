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
    await this.validarNegocio(createDto.negocioId);
    await this.validarActividad(createDto.actividadId);

    const existente = await this.repository.findOneBy({
      negocioId: createDto.negocioId,
      actividadId: createDto.actividadId,
    });

    if (existente) {
      if (existente.fecha_baja) {
        (existente as any).fecha_baja = null;
        (existente as any).usuario_baja = null;
        existente.usuario_modificacion = usuario || 'demo';
        return this.repository.save(existente);
      } else {
        throw new BadRequestException('Esta actividad ya está asignada activamente a este negocio');
      }
    }

    const relacion = this.repository.create({
      ...createDto,
      usuario_alta: usuario || 'demo',
    });

    return this.repository.save(relacion);
  }

  async update(id: number, updateDto: UpdateNegocioActividadDto, usuario?: string): Promise<NegocioActividad> {
    const relacion = await this.findOne(id);

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

    (relacion as any).fecha_baja = null;
    (relacion as any).usuario_baja = null;
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

  // ============================================================
  // NUEVO MÉTODO: Obtener especialidades por negocio y actividad
  // ============================================================
  async findEspecialidadesPorNegocioYActividad(
  negocioId: number,
  actividadId: number,
): Promise<{ id: number; nombre: string; actividadId: number; negocioId: number }[]> {
  try {
    console.log(`[DEBUG] Buscando especialidades para negocioId: ${negocioId}, actividadId: ${actividadId}`);
    
    // Verificar que el negocio tenga esta actividad
    const negocioActividad = await this.repository.findOne({
      where: {
        negocioId: negocioId,
        actividadId: actividadId,
        fecha_baja: IsNull(),
      },
    });
    
    if (!negocioActividad) {
      console.log(`[DEBUG] El negocio ${negocioId} no tiene la actividad ${actividadId}`);
      return [];
    }
    
    // Consulta SQL directa (más confiable)
    const sql = `
      SELECT DISTINCT 
        e.id, 
        e.nombre,
        $1 as "negocioId",
        $2 as "actividadId"
      FROM especialidad e
      INNER JOIN actividad_especialidad ae ON ae.especialidad_id = e.id
      WHERE ae.actividad_id = $2
        AND e.fecha_baja IS NULL
        AND ae.fecha_baja IS NULL
      ORDER BY e.nombre ASC
    `;
    
    const especialidades = await this.repository.query(sql, [negocioId, actividadId]);
    
    console.log(`[DEBUG] Especialidades encontradas: ${especialidades.length}`);
    return especialidades;
  } catch (error) {
    console.error('[DEBUG] Error en consulta de especialidades:', error);
    throw new BadRequestException(`Error al obtener especialidades: ${error.message}`);
  }
}
}
