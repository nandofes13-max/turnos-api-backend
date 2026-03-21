// src/especialidades/especialidades.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Especialidad } from './entities/especialidad.entity';
import { CreateEspecialidadDto } from './dto/create-especialidad.dto';
import { UpdateEspecialidadDto } from './dto/update-especialidad.dto';

@Injectable()
export class EspecialidadesService {
  constructor(
    @InjectRepository(Especialidad)
    private readonly especialidadRepository: Repository<Especialidad>,
  ) {}

  // ===== FUNCIÓN AUXILIAR =====
  private async verificarNombreUnico(nombre: string, id?: number): Promise<void> {
    const existente = await this.especialidadRepository.findOne({
      where: { nombre: nombre.toUpperCase() },
    });

    if (existente && existente.id !== id) {
      throw new BadRequestException(`Ya existe una especialidad con el nombre "${nombre}"`);
    }
  }

  // ===== CRUD =====
  async findAll(): Promise<Especialidad[]> {
    return this.especialidadRepository.find();
  }

  async findOne(id: number): Promise<Especialidad> {
    const especialidad = await this.especialidadRepository.findOne({
      where: { id },
    });

    if (!especialidad) {
      throw new NotFoundException(`Especialidad con id ${id} no encontrada`);
    }

    return especialidad;
  }

  async create(createEspecialidadDto: CreateEspecialidadDto, usuario?: string): Promise<Especialidad> {
    // Validar que el nombre no exista (activo o inactivo)
    await this.verificarNombreUnico(createEspecialidadDto.nombre);

    const especialidad = this.especialidadRepository.create({
      ...createEspecialidadDto,
      nombre: createEspecialidadDto.nombre.toUpperCase(),
      usuario_alta: usuario || 'demo',
    });

    return this.especialidadRepository.save(especialidad);
  }

  async update(id: number, updateEspecialidadDto: UpdateEspecialidadDto, usuario?: string): Promise<Especialidad> {
    const especialidad = await this.findOne(id);

    // Si se actualiza el nombre, verificar que no exista otro con ese nombre
    if (updateEspecialidadDto.nombre) {
      await this.verificarNombreUnico(updateEspecialidadDto.nombre, id);
      updateEspecialidadDto.nombre = updateEspecialidadDto.nombre.toUpperCase();
    }

    Object.assign(especialidad, updateEspecialidadDto);
    especialidad.usuario_modificacion = usuario || 'demo';

    return this.especialidadRepository.save(especialidad);
  }

  async softDelete(id: number, usuario?: string): Promise<void> {
    const especialidad = await this.findOne(id);
    especialidad.fecha_baja = new Date();
    especialidad.usuario_baja = usuario || 'demo';

    await this.especialidadRepository.save(especialidad);
  }

  async debugStructure(): Promise<any> {
    return this.especialidadRepository.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'especialidad';
    `);
  }
}
