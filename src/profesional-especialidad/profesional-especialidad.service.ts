import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfesionalEspecialidad } from './entities/profesional-especialidad.entity';
import { CreateProfesionalEspecialidadDto } from './dto/create-profesional-especialidad.dto';
import { UpdateProfesionalEspecialidadDto } from './dto/update-profesional-especialidad.dto';

@Injectable()
export class ProfesionalEspecialidadService {
  constructor(
    @InjectRepository(ProfesionalEspecialidad)
    private readonly repository: Repository<ProfesionalEspecialidad>,
  ) {}

  // ===== FUNCIONES AUXILIARES =====
  private async verificarCombinacionUnica(profesionalId: number, especialidadId: number, id?: number): Promise<void> {
    const existente = await this.repository.findOne({
      where: { profesionalId, especialidadId },
    });

    if (existente && existente.id !== id) {
      throw new BadRequestException(`El profesional ya tiene asignada esta especialidad`);
    }
  }

  // ===== CRUD =====
  async findAll(): Promise<ProfesionalEspecialidad[]> {
    return this.repository.find({
      relations: ['profesional', 'especialidad'],
    });
  }

  async findOne(id: number): Promise<ProfesionalEspecialidad> {
    const registro = await this.repository.findOne({
      where: { id },
      relations: ['profesional', 'especialidad'],
    });

    if (!registro) {
      throw new NotFoundException(`Registro con id ${id} no encontrado`);
    }

    return registro;
  }

  async findByProfesional(profesionalId: number): Promise<ProfesionalEspecialidad[]> {
    return this.repository.find({
      where: { profesionalId },
      relations: ['profesional', 'especialidad'],
    });
  }

  async findByEspecialidad(especialidadId: number): Promise<ProfesionalEspecialidad[]> {
    return this.repository.find({
      where: { especialidadId },
      relations: ['profesional', 'especialidad'],
    });
  }

  async create(createDto: CreateProfesionalEspecialidadDto, usuario?: string): Promise<ProfesionalEspecialidad> {
    await this.verificarCombinacionUnica(createDto.profesionalId, createDto.especialidadId);

    const registro = this.repository.create({
      ...createDto,
      usuario_alta: usuario || 'demo',
    });

    return this.repository.save(registro);
  }

  async update(id: number, updateDto: UpdateProfesionalEspecialidadDto, usuario?: string): Promise<ProfesionalEspecialidad> {
    const registro = await this.findOne(id);

    if (updateDto.profesionalId && updateDto.especialidadId) {
      await this.verificarCombinacionUnica(updateDto.profesionalId, updateDto.especialidadId, id);
    } else if (updateDto.profesionalId) {
      await this.verificarCombinacionUnica(updateDto.profesionalId, registro.especialidadId, id);
    } else if (updateDto.especialidadId) {
      await this.verificarCombinacionUnica(registro.profesionalId, updateDto.especialidadId, id);
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
      WHERE table_name = 'profesional_especialidad';
    `);
  }
}
