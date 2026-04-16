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

  // ===== FUNCIONES AUXILIARES =====
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

  // ===== CRUD =====
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
    await this.verificarAgendaActiva(createDto.agendaDisponibilidadId);
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

    const horaDesde = updateDto.horaDesde ?? registro.horaDesde;
    const horaHasta = updateDto.horaHasta ?? registro.horaHasta;
    if (updateDto.horaDesde || updateDto.horaHasta) {
      await this.verificarHorarioValido(horaDesde, horaHasta);
    }

    const agendaId = updateDto.agendaDisponibilidadId ?? registro.agendaDisponibilidadId;
    const diaSemana = updateDto.diaSemana ?? registro.diaSemana;
    
    if (updateDto.horaDesde || updateDto.horaHasta || updateDto.diaSemana || updateDto.agendaDisponibilidadId) {
      await this.verificarDuplicado(agendaId, diaSemana, horaDesde, horaHasta, id);
    }

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
