import { Injectable, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not, LessThanOrEqual } from 'typeorm';
import { AgendaDisponibilidad } from './entities/agenda-disponibilidad.entity';
import { CreateAgendaDisponibilidadDto } from './dto/create-agenda-disponibilidad.dto';
import { UpdateAgendaDisponibilidadDto } from './dto/update-agenda-disponibilidad.dto';
import { ProfesionalCentro } from '../profesional-centro/entities/profesional-centro.entity';
import { AgendaExcepcion } from '../agenda-excepciones/entities/agenda-excepcion.entity';

@Injectable()
export class AgendaDisponibilidadService implements OnModuleInit {
  constructor(
    @InjectRepository(AgendaDisponibilidad)
    private readonly repository: Repository<AgendaDisponibilidad>,
    @InjectRepository(ProfesionalCentro)
    private readonly profesionalCentroRepository: Repository<ProfesionalCentro>,
    @InjectRepository(AgendaExcepcion)
    private readonly excepcionesRepository: Repository<AgendaExcepcion>,
  ) {}

  // ===== CREAR CONSTRAINT DE EXCLUSIÓN AL INICIAR =====
  async onModuleInit() {
    await this.crearConstraintExclusion();
  }

  private async crearConstraintExclusion() {
    try {
      const result = await this.repository.query(`
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'agenda_disponibilidad'::regclass 
        AND conname = 'ex_agenda_no_solapada'
      `);
      
      if (result.length > 0) {
        console.log('✅ Constraint ex_agenda_no_solapada ya existe');
        return;
      }
      
      await this.repository.query(`
        CREATE EXTENSION IF NOT EXISTS btree_gist;
        
        ALTER TABLE agenda_disponibilidad
        ADD CONSTRAINT ex_agenda_no_solapada
        EXCLUDE USING gist (
          profesional_centro_id WITH =,
          dia_semana WITH =,
          tsrange(
            (fecha_desde + hora_desde::INTERVAL),
            (COALESCE(fecha_hasta, '9999-12-31'::date) + hora_hasta::INTERVAL)
          ) WITH &&
        )
        WHERE (fecha_baja IS NULL);
      `);
      
      console.log('✅ Constraint ex_agenda_no_solapada creada exitosamente');
    } catch (error) {
      console.error('❌ Error creando constraint ex_agenda_no_solapada:', error.message);
    }
  }

  // ===== FUNCIONES AUXILIARES =====
  private async verificarProfesionalCentroActivo(id: number): Promise<void> {
    const relacion = await this.profesionalCentroRepository.findOne({
      where: { id, fecha_baja: IsNull() },
    });
    if (!relacion) {
      throw new BadRequestException(`La relación profesional-centro no existe o está inactiva`);
    }
  }

  private async verificarDiaSemanaValido(diaSemana: number): Promise<void> {
    if (diaSemana < 0 || diaSemana > 6) {
      throw new BadRequestException(`El día de la semana debe estar entre 0 (Domingo) y 6 (Sábado)`);
    }
  }

  private async verificarHorarioValido(horaDesde: string, horaHasta: string): Promise<void> {
    if (horaDesde >= horaHasta) {
      throw new BadRequestException(`La hora desde debe ser menor a la hora hasta`);
    }
  }

  private async verificarDuracionTurnoValida(duracionTurno: number): Promise<void> {
    if (duracionTurno <= 0) {
      throw new BadRequestException(`La duración del turno debe ser mayor a 0 minutos`);
    }
  }

  private async verificarBufferMinutosValido(bufferMinutos: number): Promise<void> {
    if (bufferMinutos < 0) {
      throw new BadRequestException(`El buffer entre turnos no puede ser negativo`);
    }
  }

  private async verificarBufferValido(duracionTurno: number, bufferMinutos: number): Promise<void> {
    if (bufferMinutos > duracionTurno) {
      throw new BadRequestException(
        `El buffer entre turnos (${bufferMinutos} min) no puede ser mayor que la duración del turno (${duracionTurno} min)`
      );
    }
  }

  private async verificarRangoHorarioNocturno(
    horaDesde: string,
    horaHasta: string,
  ): Promise<void> {
    if (horaHasta <= horaDesde) {
      return;
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
    console.log('===== DIAGNÓSTICO DURACIÓN VS RANGO =====');
    console.log('horaDesde:', horaDesde);
    console.log('horaHasta:', horaHasta);
    console.log('duracionTurno:', duracionTurno);
    
    const [desdeH, desdeM] = horaDesde.split(':').map(Number);
    const [hastaH, hastaM] = horaHasta.split(':').map(Number);
    
    console.log('desdeH:', desdeH, 'desdeM:', desdeM);
    console.log('hastaH:', hastaH, 'hastaM:', hastaM);
    
    let minutosTotales;
    if (horaHasta <= horaDesde) {
      minutosTotales = (24 * 60 - (desdeH * 60 + desdeM)) + (hastaH * 60 + hastaM);
    } else {
      minutosTotales = (hastaH * 60 + hastaM) - (desdeH * 60 + desdeM);
    }
    
    console.log('minutosTotales calculados:', minutosTotales);
    
    if (minutosTotales <= 0) {
      throw new BadRequestException(`El horario desde debe ser menor al horario hasta`);
    }
    
    if (bufferMinutos === 0) {
      if (minutosTotales % duracionTurno !== 0) {
        throw new BadRequestException(
          `La duración del turno (${duracionTurno} min) no divide exactamente el rango horario de ${minutosTotales} minutos. ` +
          `Los turnos no se generarían correctamente.`
        );
      }
    } else {
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
    const agendasExistentes = await this.repository.find({
      where: {
        profesionalCentroId,
        diaSemana,
        fecha_baja: IsNull(),
      },
    });

    for (const agenda of agendasExistentes) {
      if (id && agenda.id === id) continue;

      const existeSolapamiento = (
        (horaDesde < agenda.horaHasta && horaHasta > agenda.horaDesde)
      );

      if (!existeSolapamiento) continue;

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

  // ===== GENERAR SLOTS =====
  async generarSlots(
    profesionalCentroId: number,
    fecha: string,
  ): Promise<{ disponible: boolean; hora: string; bloqueado: boolean }[]> {
    const fechaObj = new Date(fecha);
    const diaSemana = fechaObj.getDay();
    
    const agenda = await this.repository.findOne({
      where: {
        profesionalCentroId,
        diaSemana,
        fecha_baja: IsNull(),
        fechaDesde: LessThanOrEqual(fechaObj),
      },
      relations: ['profesionalCentro'],
    });
    
    if (!agenda) {
      return [];
    }
    
    const slots: { hora: string; bloqueado: boolean }[] = [];
    let horaActual = agenda.horaDesde;
    const horaFin = agenda.horaHasta;
    
    while (horaActual < horaFin) {
      slots.push({ hora: horaActual, bloqueado: false });
      const [h, m] = horaActual.split(':').map(Number);
      let minutos = m + agenda.duracionTurno;
      let horas = h;
      if (minutos >= 60) {
        horas += Math.floor(minutos / 60);
        minutos = minutos % 60;
      }
      horaActual = `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
    }
    
    const excepciones = await this.excepcionesRepository.find({
      where: {
        agendaDisponibilidadId: agenda.id,
        fecha: fechaObj,
        fecha_baja: IsNull(),
      },
    });
    
    for (const excepcion of excepciones) {
      for (let i = 0; i < slots.length; i++) {
        if (slots[i].hora >= excepcion.horaDesde && slots[i].hora < excepcion.horaHasta) {
          slots[i].bloqueado = true;
        }
      }
    }
    
    return slots.map(slot => ({
      ...slot,
      disponible: !slot.bloqueado,
    }));
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
    await this.verificarProfesionalCentroActivo(createDto.profesionalCentroId);
    await this.verificarDiaSemanaValido(createDto.diaSemana);
    await this.verificarHorarioValido(createDto.horaDesde, createDto.horaHasta);
    await this.verificarDuracionTurnoValida(createDto.duracionTurno);
    await this.verificarBufferMinutosValido(createDto.bufferMinutos || 0);
    await this.verificarBufferValido(createDto.duracionTurno, createDto.bufferMinutos || 0);
    await this.verificarRangoHorarioNocturno(createDto.horaDesde, createDto.horaHasta);
    await this.verificarDuracionRangoValido(
      createDto.horaDesde,
      createDto.horaHasta,
      createDto.duracionTurno,
      createDto.bufferMinutos || 0,
    );
    await this.verificarFechasValidas(createDto.fechaDesde, createDto.fechaHasta || null);
    await this.verificarSolapamiento(
      createDto.profesionalCentroId,
      createDto.diaSemana,
      createDto.horaDesde,
      createDto.horaHasta,
      createDto.fechaDesde,
      createDto.fechaHasta || null,
    );

    // 👇 VALIDACIÓN DE DUPLICADOS
    const existenteActivo = await this.repository.findOne({
      where: {
        profesionalCentroId: createDto.profesionalCentroId,
        diaSemana: createDto.diaSemana,
        horaDesde: createDto.horaDesde,
        horaHasta: createDto.horaHasta,
        fechaDesde: createDto.fechaDesde,
        fechaHasta: createDto.fechaHasta || IsNull(),
        fecha_baja: IsNull(),
      },
    });
    
    if (existenteActivo) {
      throw new BadRequestException('Ya existe una agenda activa con los mismos datos.');
    }
    
    const existenteEliminado = await this.repository.findOne({
      where: {
        profesionalCentroId: createDto.profesionalCentroId,
        diaSemana: createDto.diaSemana,
        horaDesde: createDto.horaDesde,
        horaHasta: createDto.horaHasta,
        fechaDesde: createDto.fechaDesde,
        fechaHasta: createDto.fechaHasta || IsNull(),
        fecha_baja: Not(IsNull()),
      },
    });
    
    if (existenteEliminado) {
      existenteEliminado.fecha_baja = null;
      existenteEliminado.usuario_baja = null;
      existenteEliminado.usuario_modificacion = usuario || 'demo';
      return this.repository.save(existenteEliminado);
    }

    const registro = this.repository.create({
      ...createDto,
      usuario_alta: usuario || 'demo',
    });

    try {
      return await this.repository.save(registro);
    } catch (error: any) {
      if (error.code === '23P01') {
        throw new BadRequestException(
          'No se puede guardar: Este horario solapa con una agenda existente para el mismo día.'
        );
      }
      throw error;
    }
  }

  async update(id: number, updateDto: UpdateAgendaDisponibilidadDto, usuario?: string): Promise<AgendaDisponibilidad> {
    const registro = await this.findOne(id);

    if (updateDto.profesionalCentroId && updateDto.profesionalCentroId !== registro.profesionalCentroId) {
      await this.verificarProfesionalCentroActivo(updateDto.profesionalCentroId);
    }

    const diaSemana = updateDto.diaSemana ?? registro.diaSemana;
    await this.verificarDiaSemanaValido(diaSemana);

    const horaDesde = updateDto.horaDesde ?? registro.horaDesde;
    const horaHasta = updateDto.horaHasta ?? registro.horaHasta;
    await this.verificarHorarioValido(horaDesde, horaHasta);

    const duracionTurno = updateDto.duracionTurno ?? registro.duracionTurno;
    await this.verificarDuracionTurnoValida(duracionTurno);

    const bufferMinutos = updateDto.bufferMinutos ?? registro.bufferMinutos;
    await this.verificarBufferMinutosValido(bufferMinutos);
    await this.verificarBufferValido(duracionTurno, bufferMinutos);
    await this.verificarRangoHorarioNocturno(horaDesde, horaHasta);
    await this.verificarDuracionRangoValido(horaDesde, horaHasta, duracionTurno, bufferMinutos);

    const fechaDesde = updateDto.fechaDesde ?? registro.fechaDesde;
    const fechaHasta = updateDto.fechaHasta ?? registro.fechaHasta;
    await this.verificarFechasValidas(fechaDesde, fechaHasta);

    const profesionalCentroId = updateDto.profesionalCentroId ?? registro.profesionalCentroId;
    
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

    try {
      return await this.repository.save(registro);
    } catch (error: any) {
      if (error.code === '23P01') {
        throw new BadRequestException(
          'No se puede actualizar: Este horario solapa con una agenda existente para el mismo día.'
        );
      }
      throw error;
    }
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
