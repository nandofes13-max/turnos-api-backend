import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ExcepcionFecha } from './entities/excepcion-fecha.entity';
import { CreateExcepcionFechaDto } from './dto/create-excepcion-fecha.dto';
import { UpdateExcepcionFechaDto } from './dto/update-excepcion-fecha.dto';
import { ProfesionalCentroEspecialidad } from '../profesional-centro/entities/profesional-centro-especialidad.entity';

@Injectable()
export class ExcepcionesFechasService {
  constructor(
    @InjectRepository(ExcepcionFecha)
    private readonly repository: Repository<ExcepcionFecha>,
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

  private async verificarFechasValidas(fechaDesde: Date, fechaHasta: Date | null): Promise<void> {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    if (fechaDesde < hoy) {
      throw new BadRequestException(`La fecha desde no puede ser anterior a hoy`);
    }
    
    if (fechaHasta && fechaHasta < fechaDesde) {
      throw new BadRequestException(`La fecha hasta debe ser mayor o igual a la fecha desde`);
    }
  }

  private async verificarHorarioValido(horaDesde: string | null, horaHasta: string | null): Promise<void> {
    if (horaDesde !== null && horaHasta !== null) {
      if (horaDesde >= horaHasta) {
        throw new BadRequestException(`La hora desde debe ser menor a la hora hasta`);
      }
    }
  }

  private async verificarDuplicado(
    profesionalCentroEspecialidadId: number,
    fechaDesde: Date,
    fechaHasta: Date | null,
    horaDesde: string | null,
    horaHasta: string | null,
    id?: number,
  ): Promise<void> {
    const existente = await this.repository.findOne({
      where: {
        profesionalCentroEspecialidadId,
        fechaDesde,
        fechaHasta: fechaHasta || IsNull(),
        horaDesde: horaDesde || IsNull(),
        horaHasta: horaHasta || IsNull(),
        fecha_baja: IsNull(),
      },
    });

    if (existente && existente.id !== id) {
      throw new BadRequestException(`Ya existe una excepción con los mismos datos`);
    }
  }

  async findAll(): Promise<ExcepcionFecha[]> {
    return this.repository.find({
      relations: ['profesionalCentroEspecialidad'],
      where: { fecha_baja: IsNull() },
    });
  }

  async findOne(id: number): Promise<ExcepcionFecha> {
    const registro = await this.repository.findOne({
      where: { id },
      relations: ['profesionalCentroEspecialidad'],
    });

    if (!registro) {
      throw new NotFoundException(`Excepción con id ${id} no encontrada`);
    }

    return registro;
  }

  async findByProfesionalCentro(profesionalCentroEspecialidadId: number): Promise<ExcepcionFecha[]> {
    return this.repository.find({
      where: { profesionalCentroEspecialidadId, fecha_baja: IsNull() },
      relations: ['profesionalCentroEspecialidad'],
    });
  }

  async create(createDto: CreateExcepcionFechaDto, usuario?: string): Promise<ExcepcionFecha> {
    await this.verificarProfesionalCentroActivo(createDto.profesionalCentroEspecialidadId);
    await this.verificarFechasValidas(createDto.fechaDesde, createDto.fechaHasta || null);
    await this.verificarHorarioValido(createDto.horaDesde || null, createDto.horaHasta || null);
    await this.verificarDuplicado(
      createDto.profesionalCentroEspecialidadId,
      createDto.fechaDesde,
      createDto.fechaHasta || null,
      createDto.horaDesde || null,
      createDto.horaHasta || null,
    );

    const registro = this.repository.create({
      ...createDto,
      usuario_alta: usuario || 'demo',
    });

    return this.repository.save(registro);
  }

  async update(id: number, updateDto: UpdateExcepcionFechaDto, usuario?: string): Promise<ExcepcionFecha> {
    const registro = await this.findOne(id);

    if (updateDto.profesionalCentroEspecialidadId && updateDto.profesionalCentroEspecialidadId !== registro.profesionalCentroEspecialidadId) {
      await this.verificarProfesionalCentroActivo(updateDto.profesionalCentroEspecialidadId);
    }

    const fechaDesde = updateDto.fechaDesde ?? registro.fechaDesde;
    const fechaHasta = updateDto.fechaHasta ?? registro.fechaHasta;
    if (updateDto.fechaDesde || updateDto.fechaHasta !== undefined) {
      await this.verificarFechasValidas(fechaDesde, fechaHasta);
    }

    const horaDesde = updateDto.horaDesde !== undefined ? updateDto.horaDesde : registro.horaDesde;
    const horaHasta = updateDto.horaHasta !== undefined ? updateDto.horaHasta : registro.horaHasta;
    if (updateDto.horaDesde !== undefined || updateDto.horaHasta !== undefined) {
      await this.verificarHorarioValido(horaDesde, horaHasta);
    }

    const profesionalCentroId = updateDto.profesionalCentroEspecialidadId ?? registro.profesionalCentroEspecialidadId;
    
    await this.verificarDuplicado(
      profesionalCentroId,
      fechaDesde,
      fechaHasta,
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
      throw new BadRequestException('La excepción ya está inactiva');
    }

    registro.fecha_baja = new Date();
    registro.usuario_baja = usuario || 'demo';

    await this.repository.save(registro);
  }
}
