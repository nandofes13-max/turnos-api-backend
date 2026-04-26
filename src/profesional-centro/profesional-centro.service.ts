import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ProfesionalCentro } from './entities/profesional-centro.entity';
import { CreateProfesionalCentroDto } from './dto/create-profesional-centro.dto';
import { UpdateProfesionalCentroDto } './dto/update-profesional-centro.dto';
import { Profesional } from '../profesional/entities/profesional.entity';
import { Especialidad } from '../especialidades/entities/especialidad.entity';
import { Centro } from '../centro/entities/centro.entity';
import { ActividadEspecialidad } from '../actividad-especialidad/entities/actividad-especialidad.entity';
import { NegocioActividad } from '../negocio-actividades/entities/negocio-actividad.entity';

@Injectable()
export class ProfesionalCentroService {
  constructor(
    @InjectRepository(ProfesionalCentro)
    private readonly repository: Repository<ProfesionalCentro>,
    @InjectRepository(Profesional)
    private readonly profesionalRepository: Repository<Profesional>,
    @InjectRepository(Especialidad)
    private readonly especialidadRepository: Repository<Especialidad>,
    @InjectRepository(Centro)
    private readonly centroRepository: Repository<Centro>,
    @InjectRepository(ActividadEspecialidad)
    private readonly actividadEspecialidadRepository: Repository<ActividadEspecialidad>,
    @InjectRepository(NegocioActividad)
    private readonly negocioActividadRepository: Repository<NegocioActividad>,
  ) {}

  // ===== FUNCIONES AUXILIARES =====
  private async verificarProfesionalActivo(id: number): Promise<void> {
    const profesional = await this.profesionalRepository.findOne({
      where: { id, fecha_baja: IsNull() },
    });
    if (!profesional) {
      throw new BadRequestException(`El profesional no existe o está inactivo`);
    }
  }

  private async verificarEspecialidadActiva(id: number): Promise<void> {
    const especialidad = await this.especialidadRepository.findOne({
      where: { id, fecha_baja: IsNull() },
    });
    if (!especialidad) {
      throw new BadRequestException(`La especialidad no existe o está inactiva`);
    }
  }

  private async verificarCentroActivo(id: number): Promise<void> {
    const centro = await this.centroRepository.findOne({
      where: { id, fecha_baja: IsNull() },
    });
    if (!centro) {
      throw new BadRequestException(`El centro no existe o está inactivo`);
    }
  }

  private async verificarCombinacionUnica(profesionalId: number, especialidadId: number, centroId: number, id?: number): Promise<void> {
    const existente = await this.repository.findOne({
      where: { profesionalId, especialidadId, centroId, fecha_baja: IsNull() },
    });

    if (existente && existente.id !== id) {
      throw new BadRequestException(`El profesional ya tiene asignada esta especialidad en este centro`);
    }
  }

  private async verificarActividadCoincideConCentro(especialidadId: number, centroId: number): Promise<void> {
    const actividadEspecialidad = await this.actividadEspecialidadRepository.findOne({
      where: { especialidadId, fecha_baja: IsNull() },
    });

    if (!actividadEspecialidad) {
      throw new BadRequestException(`La especialidad no tiene una actividad asociada`);
    }

    const actividadId = actividadEspecialidad.actividadId;

    const centro = await this.centroRepository.findOne({
      where: { id: centroId, fecha_baja: IsNull() },
    });

    if (!centro) {
      throw new BadRequestException(`El centro no existe o está inactivo`);
    }

    const negocioId = centro.negocioId;

    const negocioActividad = await this.negocioActividadRepository.findOne({
      where: {
        negocioId: negocioId,
        actividadId: actividadId,
        fecha_baja: IsNull(),
      },
    });

    if (!negocioActividad) {
      throw new BadRequestException(
        `El centro pertenece a un negocio que no ofrece la actividad requerida para esta especialidad. ` +
        `Actividad ID: ${actividadId}, Negocio ID: ${negocioId}`
      );
    }
  }

  // ===== CRUD =====
  async findAll(): Promise<ProfesionalCentro[]> {
    return this.repository.find({
      relations: ['profesional', 'especialidad', 'centro', 'centro.negocio'],
    });
  }

  async findOne(id: number): Promise<ProfesionalCentro> {
    const registro = await this.repository.findOne({
      where: { id },
      relations: ['profesional', 'especialidad', 'centro', 'centro.negocio'],
    });

    if (!registro) {
      throw new NotFoundException(`Registro con id ${id} no encontrado`);
    }

    return registro;
  }

  async findByProfesional(profesionalId: number): Promise<ProfesionalCentro[]> {
    return this.repository.find({
      where: { profesionalId },
      relations: ['profesional', 'especialidad', 'centro', 'centro.negocio'],
    });
  }

  async findByCentro(centroId: number): Promise<ProfesionalCentro[]> {
    return this.repository.find({
      where: { centroId },
      relations: ['profesional', 'especialidad', 'centro', 'centro.negocio'],
    });
  }

  async create(createDto: CreateProfesionalCentroDto, usuario?: string): Promise<ProfesionalCentro> {
    await this.verificarProfesionalActivo(createDto.profesionalId);
    await this.verificarEspecialidadActiva(createDto.especialidadId);
    await this.verificarCentroActivo(createDto.centroId);
    
    await this.verificarActividadCoincideConCentro(
      createDto.especialidadId,
      createDto.centroId,
    );
    
    await this.verificarCombinacionUnica(
      createDto.profesionalId,
      createDto.especialidadId,
      createDto.centroId,
    );

    const registro = this.repository.create({
      ...createDto,
      usuario_alta: usuario || 'demo',
    });

    return this.repository.save(registro);
  }

  async update(id: number, updateDto: UpdateProfesionalCentroDto, usuario?: string): Promise<ProfesionalCentro> {
    const registro = await this.findOne(id);

    if (updateDto.profesionalId) {
      await this.verificarProfesionalActivo(updateDto.profesionalId);
    }
    if (updateDto.especialidadId) {
      await this.verificarEspecialidadActiva(updateDto.especialidadId);
    }
    if (updateDto.centroId) {
      await this.verificarCentroActivo(updateDto.centroId);
    }

    const profesionalId = updateDto.profesionalId ?? registro.profesionalId;
    const especialidadId = updateDto.especialidadId ?? registro.especialidadId;
    const centroId = updateDto.centroId ?? registro.centroId;
    
    await this.verificarCombinacionUnica(profesionalId, especialidadId, centroId, id);

    if (updateDto.especialidadId || updateDto.centroId) {
      await this.verificarActividadCoincideConCentro(especialidadId, centroId);
    }

    if (updateDto.fecha_baja !== undefined) {
      (registro as any).fecha_baja = updateDto.fecha_baja;
    }
    if (updateDto.usuario_baja !== undefined) {
      (registro as any).usuario_baja = updateDto.usuario_baja;
    }

    Object.assign(registro, updateDto);
    registro.usuario_modificacion = usuario || 'demo';

    return this.repository.save(registro);
  }

  async softDelete(id: number, usuario?: string): Promise<void> {
    const registro = await this.findOne(id);
    registro.fecha_baja = new Date();
    registro.usuario_baja = usuario || 'demo';

    await this.repository.save(registro);
  }

  // ============================================================
  // NUEVO MÉTODO: Obtener especialidades con disponibilidad para un negocio y actividad
  // ============================================================
  async findEspecialidadesConDisponibilidad(
    negocioId: number,
    actividadId: number,
  ): Promise<{ id: number; nombre: string }[]> {
    // 1. Obtener los centros del negocio
    const centros = await this.centroRepository.find({
      where: { negocioId, fecha_baja: IsNull() },
      select: ['id'],
    });
    
    const centroIds = centros.map(c => c.id);
    
    if (centroIds.length === 0) {
      return [];
    }
    
    // 2. Obtener especialidades con agenda activa
    const results = await this.repository
      .createQueryBuilder('pc')
      .select('DISTINCT pc.especialidadId', 'id')
      .addSelect('e.nombre', 'nombre')
      .innerJoin('pc.centro', 'c')
      .innerJoin('pc.especialidad', 'e')
      .innerJoin('actividad_especialidad', 'ae', 'ae.especialidad_id = pc.especialidadId AND ae.fecha_baja IS NULL')
      .innerJoin('agenda_disponibilidad', 'ag', 'ag.profesional_centro_id = pc.id AND ag.fecha_baja IS NULL')
      .where('c.negocioId = :negocioId', { negocioId })
      .andWhere('ae.actividad_id = :actividadId', { actividadId })
      .andWhere('pc.fecha_baja IS NULL')
      .andWhere('c.fecha_baja IS NULL')
      .andWhere('e.fecha_baja IS NULL')
      .orderBy('e.nombre', 'ASC')
      .getRawMany();
    
    return results;
  }

  async debugStructure(): Promise<any> {
    return this.repository.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'profesional_centro';
    `);
  }
}
