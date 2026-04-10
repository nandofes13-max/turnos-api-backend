import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { AgendaExcepcion } from './entities/agenda-excepcion.entity';
import { CreateAgendaExcepcionDto } from './dto/create-agenda-excepcion.dto';
import { UpdateAgendaExcepcionDto } from './dto/update-agenda-excepcion.dto';
import { AgendaDisponibilidad } from '../agenda-disponibilidad/entities/agenda-disponibilidad.entity';

@Injectable()
export class AgendaExcepcionesService {
  constructor(
    @InjectRepository(AgendaExcepcion)
    private readonly repository: Repository<AgendaExcepcion>,
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

  private async verificarFechaValida(fecha: Date): Promise<void> {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    if (fecha < hoy) {
      throw new BadRequestException(`No se pueden crear excepciones para fechas pasadas`);
    }
  }

  private async verificarDuplicado(
    agendaDisponibilidadId: number,
    fecha: Date,
    hora: string,
    id?: number,
  ): Promise<void> {
    const existente = await this.repository.findOne({
      where: {
        agendaDisponibilidadId,
        fecha,
        hora,
        fecha_baja: IsNull(),
      },
    });

    if (existente && existente.id !== id) {
      throw new BadRequestException(`Ya existe una excepción para esta agenda, fecha y hora`);
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
    // Validar que la agenda exista y esté activa
    await this.verificarAgendaActiva(createDto.agendaDisponibilidadId);
    
    // Validar fecha
    await this.verificarFechaValida(createDto.fecha);
    
    // Validar que no exista duplicado
    await this.verificarDuplicado(
      createDto.agendaDisponibilidadId,
      createDto.fecha,
      createDto.hora,
    );

    const registro = this.repository.create({
      ...createDto,
      usuario_alta: usuario || 'demo',
    });

    return this.repository.save(registro);
  }

  async update(id: number, updateDto: UpdateAgendaExcepcionDto, usuario?: string): Promise<AgendaExcepcion> {
    const registro = await this.findOne(id);

    // Si se cambia la agenda, validar que exista
    if (updateDto.agendaDisponibilidadId && updateDto.agendaDisponibilidadId !== registro.agendaDisponibilidadId) {
      await this.verificarAgendaActiva(updateDto.agendaDisponibilidadId);
    }

    // Si se cambia fecha, validar
    if (updateDto.fecha) {
      await this.verificarFechaValida(updateDto.fecha);
    }

    // Validar duplicado si cambian datos relevantes
    const agendaId = updateDto.agendaDisponibilidadId ?? registro.agendaDisponibilidadId;
    const fecha = updateDto.fecha ?? registro.fecha;
    const hora = updateDto.hora ?? registro.hora;
    
    await this.verificarDuplicado(agendaId, fecha, hora, id);

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
