import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { AgendaDisponibilidad } from './entities/agenda-disponibilidad.entity';
import { CreateAgendaDisponibilidadDto } from './dto/create-agenda-disponibilidad.dto';
import { UpdateAgendaDisponibilidadDto } from './dto/update-agenda-disponibilidad.dto';
import { ProfesionalCentro } from '../profesional-centro/entities/profesional-centro.entity';

@Injectable()
export class AgendaDisponibilidadService {
  constructor(
    @InjectRepository(AgendaDisponibilidad)
    private readonly repository: Repository<AgendaDisponibilidad>,
    @InjectRepository(ProfesionalCentro)
    private readonly profesionalCentroRepository: Repository<ProfesionalCentro>,
  ) {}

  // ===== FUNCIONES AUXILIARES =====
  private async verificarProfesionalCentroActivo(id: number): Promise<void> {
    const relacion = await this.profesionalCentroRepository.findOne({
      where: { id, fecha_baja: IsNull() },
    });
    if (!relacion) {
      throw new BadRequestException(`La relación profesional-centro no existe o está inactiva`);
    }
  }

  private async verificarHorarioValido(horaDesde: string, horaHasta: string): Promise<void> {
    if (horaDesde >= horaHasta) {
      throw new BadRequestException(`La hora desde debe ser menor a la hora hasta`);
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

  private async verificarDuracionRangoValido(
    horaDesde: string,
    horaHasta: string,
    duracionTurno: number,
    bufferMinutos: number,
  ): Promise<void> {
    // Calcular minutos totales del rango
    const [desdeH, desdeM] = horaDesde.split(':').map(Number);
    const [hastaH, hastaM] = horaHasta.split(':').map(Number);
    const minutosTotales = (hastaH * 60 + hastaM) - (desdeH * 60 + desdeM);
    
    if (minutosTotales <= 0) {
      throw new BadRequestException(`El horario desde debe ser menor al horario hasta`);
    }
    
    // Si buffer es 0, validar divisibilidad exacta
    if (bufferMinutos === 0) {
      if (minutosTotales % duracionTurno !== 0) {
        throw new BadRequestException(
          `La duración del turno (${duracionTurno} min) no divide exactamente el rango horario de ${minutosTotales} minutos. ` +
          `Los turnos no se generarían correctamente.`
        );
      }
    } else {
      // Con buffer > 0, validar fórmula: n * duracion + (n-1) * buffer = minutosTotales
      let n = 1;
      let valido = false;
      while (n * duracionTurno <= minutosTotales) {
        const totalConBuffer = n * duracionTurno + (n - 1) * bufferMinutos;
        if (totalConBuffer === minutosTotales) {
          valido = true;
          break;
        }
        n++;
      }
      
      if (!valido) {
        throw new BadRequestException(
          `La combinación de duración (${duracionTurno} min) y buffer (${bufferMinutos} min) ` +
          `no permite generar turnos exactos en el rango de ${minutosTotales} minutos.`
        );
      }
    }
  }

  private async verificarSolapamiento(
    profesionalCentroId: number,
    diaSemana: number,
    horaDesde: string,
    horaHasta: string,
    fechaDesde: Date,
    fechaHasta: Date | null,
    id?: number,
  ): Promise<void> {
    // Buscar agendas existentes para el mismo profesional-centro y mismo día
    const agendasExistentes = await this.repository.find({
      where: {
        profesionalCentroId,
        diaSemana,
        fecha_baja: IsNull(),
      },
    });

    for (const agenda of agendasExistentes) {
      if (id && agenda.id === id) continue;

      // Verificar solapamiento de rangos horarios
      const existeSolapamiento = (
        (horaDesde < agenda.horaHasta && horaHasta > agenda.horaDesde)
      );

      if (!existeSolapamiento) continue;

      // Verificar solapamiento de rangos de fechas
      const agendaFechaHasta = agenda.fechaHasta || new Date('9999-12-31');
      const nuevaFechaHasta = fechaHasta || new Date('9999-12-31');
      
      const fechasSolapan = (
        fechaDesde <= agendaFechaHasta &&
        nuevaFechaHasta >= agenda.fechaDesde
      );

      if (fechasSolapan) {
        throw new BadRequestException(
          `Ya existe una agenda para este profesional-centro en el día ${diaSemana} ` +
          `con horario ${agenda.horaDesde} a ${agenda.horaHasta} que solapa con el rango de fechas`
        );
      }
    }
  }

  // ===== CRUD =====
  async findAll(): Promise<AgendaDisponibilidad[]> {
    return this.repository.find({
      relations: ['profesionalCentro', 'profesionalCentro.profesional', 'profesionalCentro.especialidad', 'profesionalCentro.centro'],
      where: { fecha_baja: IsNull() },
    });
  }

  async findOne(id: number): Promise<AgendaDisponibilidad> {
    const registro = await this.repository.findOne({
      where: { id },
      relations: ['profesionalCentro', 'profesionalCentro.profesional', 'profesionalCentro.especialidad', 'profesionalCentro.centro'],
    });

    if (!registro) {
      throw new NotFoundException(`Agenda con id ${id} no encontrada`);
    }

    return registro;
  }

  async findByProfesionalCentro(profesionalCentroId: number): Promise<AgendaDisponibilidad[]> {
    return this.repository.find({
      where: { profesionalCentroId, fecha_baja: IsNull() },
      relations: ['profesionalCentro'],
    });
  }

  async create(createDto: CreateAgendaDisponibilidadDto, usuario?: string): Promise<AgendaDisponibilidad> {
    // Validar que la relación profesional-centro exista y esté activa
    await this.verificarProfesionalCentroActivo(createDto.profesionalCentroId);
    
    // Validar horario
    await this.verificarHorarioValido(createDto.horaDesde, createDto.horaHasta);
    
    // Validar duración vs rango
    await this.verificarDuracionRangoValido(
      createDto.horaDesde,
      createDto.horaHasta,
      createDto.duracionTurno,
      createDto.bufferMinutos || 0,
    );
    
    // Validar fechas
    await this.verificarFechasValidas(createDto.fechaDesde, createDto.fechaHasta || null);
    
    // Validar solapamiento
    await this.verificarSolapamiento(
      createDto.profesionalCentroId,
      createDto.diaSemana,
      createDto.horaDesde,
      createDto.horaHasta,
      createDto.fechaDesde,
      createDto.fechaHasta || null,
    );

    const registro = this.repository.create({
      ...createDto,
      usuario_alta: usuario || 'demo',
    });

    return this.repository.save(registro);
  }

  async update(id: number, updateDto: UpdateAgendaDisponibilidadDto, usuario?: string): Promise<AgendaDisponibilidad> {
    const registro = await this.findOne(id);

    // Validar relación profesional-centro si se actualiza
    if (updateDto.profesionalCentroId && updateDto.profesionalCentroId !== registro.profesionalCentroId) {
      await this.verificarProfesionalCentroActivo(updateDto.profesionalCentroId);
    }

    // Validar horario si se actualiza
    const horaDesde = updateDto.horaDesde ?? registro.horaDesde;
    const horaHasta = updateDto.horaHasta ?? registro.horaHasta;
    await this.verificarHorarioValido(horaDesde, horaHasta);

    // Validar duración vs rango si cambian valores relevantes
    const duracionTurno = updateDto.duracionTurno ?? registro.duracionTurno;
    const bufferMinutos = updateDto.bufferMinutos ?? registro.bufferMinutos;
    await this.verificarDuracionRangoValido(horaDesde, horaHasta, duracionTurno, bufferMinutos);

    // Validar fechas si se actualizan
    const fechaDesde = updateDto.fechaDesde ?? registro.fechaDesde;
    const fechaHasta = updateDto.fechaHasta ?? registro.fechaHasta;
    await this.verificarFechasValidas(fechaDesde, fechaHasta);

    // Validar solapamiento si cambian datos relevantes
    const profesionalCentroId = updateDto.profesionalCentroId ?? registro.profesionalCentroId;
    const diaSemana = updateDto.diaSemana ?? registro.diaSemana;
    
    await this.verificarSolapamiento(
      profesionalCentroId,
      diaSemana,
      horaDesde,
      horaHasta,
      fechaDesde,
      fechaHasta,
      id,
    );

    Object.assign(registro, updateDto);
    registro.usuario_modificacion = usuario || 'demo';

    return this.repository.save(registro);
  }

  async softDelete(id: number, usuario?: string): Promise<void> {
    const registro = await this.findOne(id);
    
    if (registro.fecha_baja) {
      throw new BadRequestException('La agenda ya está inactiva');
    }

    registro.fecha_baja = new Date();
    registro.usuario_baja = usuario || 'demo';

    await this.repository.save(registro);
  }

  async debugStructure(): Promise<any> {
    return this.repository.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'agenda_disponibilidad';
    `);
  }
}
