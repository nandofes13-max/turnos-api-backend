import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ExcepcionRecurrente } from './entities/excepcion-recurrente.entity';
import { CreateExcepcionRecurrenteDto } from './dto/create-excepcion-recurrente.dto';
import { UpdateExcepcionRecurrenteDto } from './dto/update-excepcion-recurrente.dto';
import { ProfesionalCentroEspecialidad } from '../profesional-centro/entities/profesional-centro-especialidad.entity';

@Injectable()
export class ExcepcionesRecurrentesService {
  constructor(
    @InjectRepository(ExcepcionRecurrente)
    private readonly repository: Repository<ExcepcionRecurrente>,
    @InjectRepository(ProfesionalCentroEspecialidad)
    private readonly profesionalCentroRepository: Repository<ProfesionalCentroEspecialidad>,
  ) {}

  private async verificarProfesionalCentroActivo(id: number): Promise<void> {
    const registro = await this.profesionalCentroRepository.findOne({
      where: { id, fecha_baja: IsNull() },
    });
    if (!registro) {
      throw new BadRequestException(`El profesional-centro-especialidad con id ${id} no existe o está inactivo`);
    }
  }

  private async verificarHorarioValido(horaDesde: string, horaHasta: string): Promise<void> {
    if (horaDesde >= horaHasta) {
      throw new BadRequestException(`La hora desde debe ser menor a la hora hasta`);
    }
  }

  private async verificarDuplicado(
    profesionalCentroEspecialidadId: number,
    diaSemana: number,
    horaDesde: string,
    horaHasta: string,
    id?: number,
  ): Promise<void> {
    const existente = await this.repository.findOne({
      where: {
        profesionalCentroEspecialidadId,
        diaSemana,
        horaDesde,
        horaHasta,
        fecha_baja: IsNull(),
      },
    });

    if (existente && existente.id !== id) {
      throw new BadRequestException(`Ya existe una excepción recurrente con los mismos datos`);
    }
  }

  private validarDiaSemana(diaSemana: number): void {
    if (diaSemana < 0 || diaSemana > 6) {
      throw new BadRequestException(`El día de semana debe ser un valor entre 0 (Domingo) y 6 (Sábado)`);
    }
  }

  async findAll(): Promise<ExcepcionRecurrente[]> {
    return this.repository.find({
      relations: ['profesionalCentroEspecialidad'],
      where: { fecha_baja: IsNull() },
    });
  }

  async findOne(id: number): Promise<ExcepcionRecurrente> {
    const registro = await this.repository.findOne({
      where: { id },
      relations: ['profesionalCentroEspecialidad'],
    });

    if (!registro) {
      throw new NotFoundException(`Excepción recurrente con id ${id} no encontrada`);
    }

    return registro;
  }

  async findByProfesionalCentro(profesionalCentroEspecialidadId: number): Promise<ExcepcionRecurrente[]> {
    return this.repository.find({
      where: { profesionalCentroEspecialidadId, fecha_baja: IsNull() },
      relations: ['profesionalCentroEspecialidad'],
    });
  }

  async create(createDto: CreateExcepcionRecurrenteDto, usuario?: string): Promise<ExcepcionRecurrente> {
    await this.verificarProfesionalCentroActivo(createDto.profesionalCentroEspecialidadId);
    this.validarDiaSemana(createDto.diaSemana);
    await this.verificarHorarioValido(createDto.horaDesde, createDto.horaHasta);
    await this.verificarDuplicado(
      createDto.profesionalCentroEspecialidadId,
      createDto.diaSemana,
      createDto.horaDesde,
      createDto.horaHasta,
    );

    const registro = this.repository.create({
      ...createDto,
      usuario_alta: usuario || 'demo',
    });

    return this.repository.save(registro);
  }

  async update(id: number, updateDto: UpdateExcepcionRecurrenteDto, usuario?: string): Promise<ExcepcionRecurrente> {
    const registro = await this.findOne(id);

    if (updateDto.profesionalCentroEspecialidadId && updateDto.profesionalCentroEspecialidadId !== registro.profesionalCentroEspecialidadId) {
      await this.verificarProfesionalCentroActivo(updateDto.profesionalCentroEspecialidadId);
    }

    if (updateDto.diaSemana !== undefined) {
      this.validarDiaSemana(updateDto.diaSemana);
    }

    const horaDesde = updateDto.horaDesde ?? registro.horaDesde;
    const horaHasta = updateDto.horaHasta ?? registro.horaHasta;
    if (updateDto.horaDesde !== undefined || updateDto.horaHasta !== undefined) {
      await this.verificarHorarioValido(horaDesde, horaHasta);
    }

    const profesionalCentroId = updateDto.profesionalCentroEspecialidadId ?? registro.profesionalCentroEspecialidadId;
    const diaSemana = updateDto.diaSemana ?? registro.diaSemana;
    
    await this.verificarDuplicado(
      profesionalCentroId,
      diaSemana,
      horaDesde,
      horaHasta,
      id,
    );

    Object.assign(registro, updateDto);
    registro.usuario_modificacion = usuario || 'demo';

    return this.repository.save(registro);
  }

  async softDelete(id: number, usuario?: string): Promise<void> {
    const registro = await this.findOne(id);
    
    if (registro.fecha_baja) {
      throw new BadRequestException('La excepción recurrente ya está inactiva');
    }

    registro.fecha_baja = new Date();
    registro.usuario_baja = usuario || 'demo';

    await this.repository.save(registro);
  }
}
