// src/excepciones-recurrentes/excepciones-recurrentes.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ExcepcionRecurrente } from './entities/excepcion-recurrente.entity';
import { CreateExcepcionRecurrenteDto } from './dto/create-excepcion-recurrente.dto';
import { UpdateExcepcionRecurrenteDto } from './dto/update-excepcion-recurrente.dto';
import { AgendaDisponibilidad } from '../agenda-disponibilidad/entities/agenda-disponibilidad.entity';

@Injectable()
export class ExcepcionesRecurrentesService {
  constructor(
    @InjectRepository(ExcepcionRecurrente)
    private readonly repository: Repository<ExcepcionRecurrente>,
    @InjectRepository(AgendaDisponibilidad)
    private readonly agendaRepository: Repository<AgendaDisponibilidad>,
  ) {}

  // ============================================================
  // FUNCIÓN AUXILIAR: Normalizar hora (eliminar segundos)
  // ============================================================
  private normalizarHora(hora: string): string {
    if (!hora) return hora;
    if (hora.length > 5) {
      return hora.slice(0, 5);
    }
    return hora;
  }

  private async verificarAgendaActiva(id: number): Promise<void> {
    const agenda = await this.agendaRepository.findOne({
      where: { id, fecha_baja: IsNull() },
    });
    if (!agenda) {
      throw new BadRequestException(`La agenda con id ${id} no existe o está inactiva`);
    }
  }

  private async verificarHorarioValido(horaDesde: string, horaHasta: string): Promise<void> {
    if (horaDesde >= horaHasta) {
      throw new BadRequestException(`La hora desde debe ser menor a la hora hasta`);
    }
  }

  private validarDiaSemana(diaSemana: number): void {
    if (diaSemana < 0 || diaSemana > 6) {
      throw new BadRequestException(`El día de semana debe ser un valor entre 0 (Domingo) y 6 (Sábado)`);
    }
  }

  private async verificarDuplicado(
    agendaDisponibilidadId: number,
    diaSemana: number,
    horaDesde: string,
    horaHasta: string,
    id?: number,
  ): Promise<void> {
    const existente = await this.repository.findOne({
      where: {
        agendaDisponibilidadId,
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

  async findAll(): Promise<ExcepcionRecurrente[]> {
    return this.repository.find({
      relations: ['agendaDisponibilidad'],
      where: { fecha_baja: IsNull() },
    });
  }

  async findOne(id: number): Promise<ExcepcionRecurrente> {
    const registro = await this.repository.findOne({
      where: { id },
      relations: ['agendaDisponibilidad'],
    });

    if (!registro) {
      throw new NotFoundException(`Excepción recurrente con id ${id} no encontrada`);
    }

    return registro;
  }

  async findByAgenda(agendaDisponibilidadId: number): Promise<ExcepcionRecurrente[]> {
    return this.repository.find({
      where: { agendaDisponibilidadId, fecha_baja: IsNull() },
      relations: ['agendaDisponibilidad'],
    });
  }

  async create(createDto: CreateExcepcionRecurrenteDto, usuario?: string): Promise<ExcepcionRecurrente> {
    // Normalizar horas
    createDto.horaDesde = this.normalizarHora(createDto.horaDesde);
    createDto.horaHasta = this.normalizarHora(createDto.horaHasta);
    
    await this.verificarAgendaActiva(createDto.agendaDisponibilidadId);
    this.validarDiaSemana(createDto.diaSemana);
    await this.verificarHorarioValido(createDto.horaDesde, createDto.horaHasta);
    await this.verificarDuplicado(
      createDto.agendaDisponibilidadId,
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

    if (updateDto.agendaDisponibilidadId && updateDto.agendaDisponibilidadId !== registro.agendaDisponibilidadId) {
      await this.verificarAgendaActiva(updateDto.agendaDisponibilidadId);
    }

    if (updateDto.diaSemana !== undefined) {
      this.validarDiaSemana(updateDto.diaSemana);
    }

    const horaDesde = updateDto.horaDesde ?? registro.horaDesde;
    const horaHasta = updateDto.horaHasta ?? registro.horaHasta;
    
    // Normalizar horas si vienen en updateDto
    const horaDesdeNorm = horaDesde ? this.normalizarHora(horaDesde) : horaDesde;
    const horaHastaNorm = horaHasta ? this.normalizarHora(horaHasta) : horaHasta;
    
    if (updateDto.horaDesde !== undefined || updateDto.horaHasta !== undefined) {
      await this.verificarHorarioValido(horaDesdeNorm, horaHastaNorm);
    }

    const agendaId = updateDto.agendaDisponibilidadId ?? registro.agendaDisponibilidadId;
    const diaSemana = updateDto.diaSemana ?? registro.diaSemana;
    
    await this.verificarDuplicado(
      agendaId,
      diaSemana,
      horaDesdeNorm,
      horaHastaNorm,
      id,
    );

    Object.assign(registro, updateDto);
    if (updateDto.horaDesde !== undefined) registro.horaDesde = horaDesdeNorm;
    if (updateDto.horaHasta !== undefined) registro.horaHasta = horaHastaNorm;
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

  // ============================================================
  // NUEVO MÉTODO: Habilitar por campos (sin exponer ID)
  // ============================================================
  async habilitar(
    agendaDisponibilidadId: number,
    diaSemana: number,
    horaDesde: string,
    horaHasta: string,
    usuario?: string
  ): Promise<void> {
    // Normalizar horas
    const horaDesdeNorm = this.normalizarHora(horaDesde);
    const horaHastaNorm = this.normalizarHora(horaHasta);
    
    // Buscar la excepción activa
    const excepcion = await this.repository.findOne({
      where: {
        agendaDisponibilidadId,
        diaSemana,
        horaDesde: horaDesdeNorm,
        horaHasta: horaHastaNorm,
        fecha_baja: IsNull()
      }
    });

    if (!excepcion) {
      throw new NotFoundException(
        `No se encontró una excepción activa para la agenda ${agendaDisponibilidadId}, día ${diaSemana}, horario ${horaDesdeNorm} a ${horaHastaNorm}`
      );
    }

    // Soft delete
    excepcion.fecha_baja = new Date();
    excepcion.usuario_baja = usuario || 'demo';
    await this.repository.save(excepcion);
  }
}
