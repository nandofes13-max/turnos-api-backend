import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfesionalCentro } from './entities/profesional-centro.entity';
import { CreateProfesionalCentroDto } from './dto/create-profesional-centro.dto';
import { UpdateProfesionalCentroDto } from './dto/update-profesional-centro.dto';
import { Profesional } from '../profesional/entities/profesional.entity';
import { Especialidad } from '../especialidades/entities/especialidad.entity';
import { Centro } from '../centro/entities/centro.entity';

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
  ) {}

  // ===== FUNCIONES AUXILIARES =====
  private async verificarProfesionalActivo(id: number): Promise<void> {
    const profesional = await this.profesionalRepository.findOne({
      where: { id },
    });
    if (!profesional || profesional.fecha_baja) {
      throw new BadRequestException(`El profesional no existe o está inactivo`);
    }
  }

  private async verificarEspecialidadActiva(id: number): Promise<void> {
    const especialidad = await this.especialidadRepository.findOne({
      where: { id },
    });
    if (!especialidad || especialidad.fecha_baja) {
      throw new BadRequestException(`La especialidad no existe o está inactiva`);
    }
  }

  private async verificarCentroActivo(id: number): Promise<void> {
    const centro = await this.centroRepository.findOne({
      where: { id },
    });
    if (!centro || centro.fecha_baja) {
      throw new BadRequestException(`El centro no existe o está inactivo`);
    }
  }

  private async verificarCombinacionUnica(profesionalId: number, especialidadId: number, centroId: number, id?: number): Promise<void> {
    const existente = await this.repository.findOne({
      where: { profesionalId, especialidadId, centroId },
    });

    if (existente && existente.id !== id) {
      throw new BadRequestException(`El profesional ya tiene asignada esta especialidad en este centro`);
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
    // Validar que todos los IDs existan y estén activos
    await this.verificarProfesionalActivo(createDto.profesionalId);
    await this.verificarEspecialidadActiva(createDto.especialidadId);
    await this.verificarCentroActivo(createDto.centroId);
    
    // Validar combinación única
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

    // Si se actualiza algún ID, validar existencia y actividad
    if (updateDto.profesionalId) {
      await this.verificarProfesionalActivo(updateDto.profesionalId);
    }
    if (updateDto.especialidadId) {
      await this.verificarEspecialidadActiva(updateDto.especialidadId);
    }
    if (updateDto.centroId) {
      await this.verificarCentroActivo(updateDto.centroId);
    }

    // Validar combinación única si cambian los IDs
    const profesionalId = updateDto.profesionalId ?? registro.profesionalId;
    const especialidadId = updateDto.especialidadId ?? registro.especialidadId;
    const centroId = updateDto.centroId ?? registro.centroId;
    
    await this.verificarCombinacionUnica(profesionalId, especialidadId, centroId, id);

    // Para reactivar (enviar null)
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

  async debugStructure(): Promise<any> {
    return this.repository.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'profesional_centro';
    `);
  }
}
