import { Injectable, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { AgendaExcepcion } from './entities/agenda-excepcion.entity';
import { CreateAgendaExcepcionDto } from './dto/create-agenda-excepcion.dto';
import { UpdateAgendaExcepcionDto } from './dto/update-agenda-excepcion.dto';
import { AgendaDisponibilidad } from '../agenda-disponibilidad/entities/agenda-disponibilidad.entity';

@Injectable()
export class AgendaExcepcionesService implements OnModuleInit {
  constructor(
    @InjectRepository(AgendaExcepcion)
    private readonly repository: Repository<AgendaExcepcion>,
    @InjectRepository(AgendaDisponibilidad)
    private readonly agendaRepository: Repository<AgendaDisponibilidad>,
  ) {}

  async onModuleInit() {
    // Verificar constraint de exclusión si es necesaria
  }

  // ===== FUNCIONES AUXILIARES =====
  private async verificarAgendaActiva(id: number): Promise<void> {
    const agenda = await this.agendaRepository.findOne({
      where: { id, fecha_baja: IsNull() },
    });
    if (!agenda) {
      throw new BadRequestException(`La agenda con id ${id} no existe o está inactiva`);
    }
  }

  private async verificarFechaValida(fecha: Date): Promise<void> {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    if (fecha < hoy) {
      throw new BadRequestException(`No se pueden crear excepciones para fechas pasadas`);
    }
  }

  private async verificarHorarioValido(horaDesde: string, horaHasta: string): Promise<void> {
    if (horaDesde >= horaHasta) {
      throw new BadRequestException(`La hora desde debe ser menor a la hora hasta`);
    }
  }

  private async verificarRangoExcepcion(
    agendaDisponibilidadId: number,
    fecha: Date,
    horaDesde: string,
    horaHasta: string,
    id?: number,
  ): Promise<void> {
    // Verificar solapamiento con otras excepciones de la misma agenda y fecha
    const existentes = await this.repository.find({
      where: {
        agendaDisponibilidadId,
        fecha,
        fecha_baja: IsNull(),
      },
    });

    for (const excepcion of existentes) {
      if (id && excepcion.id === id) continue;

      const solapa = (
        horaDesde < excepcion.horaHasta && horaHasta > excepcion.horaDesde
      );

      if (solapa) {
        throw new BadRequestException(
          `El rango horario ${horaDesde} a ${horaHasta} solapa con una excepción existente ` +
          `(${excepcion.horaDesde} a ${excepcion.horaHasta}) para la misma fecha`
        );
      }
    }
  }

  // ===== CRUD =====
  async findAll(): Promise<AgendaExcepcion[]> {
    return this.repository.find({
      relations: ['agendaDisponibilidad'],
      where: { fecha_baja: IsNull() },
    });
  }

  async findOne(id: number): Promise<AgendaExcepcion> {
    const registro = await this.repository.findOne({
      where: { id },
      relations: ['agendaDisponibilidad'],
    });

    if (!registro) {
      throw new NotFoundException(`Excepción con id ${id} no encontrada`);
    }

    return registro;
  }

  async findByAgenda(agendaDisponibilidadId: number): Promise<AgendaExcepcion[]> {
    return this.repository.find({
      where: { agendaDisponibilidadId, fecha_baja: IsNull() },
      relations: ['agendaDisponibilidad'],
    });
  }

  async findByFecha(fecha: Date): Promise<AgendaExcepcion[]> {
    return this.repository.find({
      where: { fecha, fecha_baja: IsNull() },
      relations: ['agendaDisponibilidad'],
    });
  }

  async create(createDto: CreateAgendaExcepcionDto, usuario?: string): Promise<AgendaExcepcion> {
    await this.verificarAgendaActiva(createDto.agendaDisponibilidadId);
    await this.verificarFechaValida(createDto.fecha);
    await this.verificarHorarioValido(createDto.horaDesde, createDto.horaHasta);
    await this.verificarRangoExcepcion(
      createDto.agendaDisponibilidadId,
      createDto.fecha,
      createDto.horaDesde,
      createDto.horaHasta,
    );

    const registro = this.repository.create({
      ...createDto,
      usuario_alta: usuario || 'demo',
    });

    return this.repository.save(registro);
  }

  async update(id: number, updateDto: UpdateAgendaExcepcionDto, usuario?: string): Promise<AgendaExcepcion> {
    const registro = await this.findOne(id);

    if (updateDto.agendaDisponibilidadId && updateDto.agendaDisponibilidadId !== registro.agendaDisponibilidadId) {
      await this.verificarAgendaActiva(updateDto.agendaDisponibilidadId);
    }

    if (updateDto.fecha) {
      await this.verificarFechaValida(updateDto.fecha);
    }

    const horaDesde = updateDto.horaDesde ?? registro.horaDesde;
    const horaHasta = updateDto.horaHasta ?? registro.horaHasta;
    if (updateDto.horaDesde || updateDto.horaHasta) {
      await this.verificarHorarioValido(horaDesde, horaHasta);
    }

    const agendaId = updateDto.agendaDisponibilidadId ?? registro.agendaDisponibilidadId;
    const fecha = updateDto.fecha ?? registro.fecha;
    
    if (updateDto.horaDesde || updateDto.horaHasta || updateDto.fecha || updateDto.agendaDisponibilidadId) {
      await this.verificarRangoExcepcion(agendaId, fecha, horaDesde, horaHasta, id);
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

  async debugStructure(): Promise<any> {
    return this.repository.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'agenda_excepciones';
    `);
  }
}
