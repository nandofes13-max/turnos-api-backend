// src/agenda-disponibilidad/agenda-disponibilidad.service.ts
import { Injectable, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not, LessThanOrEqual, In } from 'typeorm';
import { AgendaDisponibilidad } from './entities/agenda-disponibilidad.entity';
import { CreateAgendaDisponibilidadDto } from './dto/create-agenda-disponibilidad.dto';
import { UpdateAgendaDisponibilidadDto } from './dto/update-agenda-disponibilidad.dto';
import { ProfesionalCentro } from '../profesional-centro/entities/profesional-centro.entity';
import { Centro } from '../centro/entities/centro.entity';
import { ExcepcionFecha } from '../excepciones-fechas/entities/excepcion-fecha.entity';

@Injectable()
export class AgendaDisponibilidadService implements OnModuleInit {
  constructor(
    @InjectRepository(AgendaDisponibilidad)
    private readonly repository: Repository<AgendaDisponibilidad>,
    @InjectRepository(ProfesionalCentro)
    private readonly profesionalCentroRepository: Repository<ProfesionalCentro>,
    @InjectRepository(Centro)
    private readonly centroRepository: Repository<Centro>,
    @InjectRepository(ExcepcionFecha)
    private readonly excepcionesFechasRepository: Repository<ExcepcionFecha>,
  ) {}

  // ===== OBTENER TIMEZONE DESDE PROFESIONAL_CENTRO =====
  private async obtenerTimezoneDesdeProfesionalCentro(profesionalCentroId: number): Promise<string> {
    try {
      const relacion = await this.profesionalCentroRepository.findOne({
        where: { id: profesionalCentroId, fecha_baja: IsNull() },
        relations: ['centro'],
      });
      
      if (!relacion) {
        console.warn(`No se encontró la relación profesional-centro ID ${profesionalCentroId}`);
        return 'America/Argentina/Buenos_Aires';
      }
      
      if (relacion.centro && relacion.centro.timezone) {
        console.log(`Timezone obtenido para agenda: ${relacion.centro.timezone} (desde centro ID ${relacion.centro.id})`);
        return relacion.centro.timezone;
      }
      
      if (relacion.centroId) {
        const centro = await this.centroRepository.findOne({
          where: { id: relacion.centroId },
        });
        if (centro && centro.timezone) {
          console.log(`Timezone obtenido para agenda: ${centro.timezone} (desde centro ID ${centro.id})`);
          return centro.timezone;
        }
      }
      
      console.warn(`No se pudo obtener timezone para profesional-centro ID ${profesionalCentroId}, usando default`);
      return 'America/Argentina/Buenos_Aires';
    } catch (error) {
      console.error('Error obteniendo timezone:', error);
      return 'America/Argentina/Buenos_Aires';
    }
  }

  private normalizarHora(hora: string): string {
    if (!hora) return hora;
    if (hora.length > 5) {
      return hora.slice(0, 5);
    }
    return hora;
  }

  async onModuleInit() {}

  private async crearConstraintExclusion() {
    try {
      const result = await this.repository.query(`
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'agenda_disponibilidad'::regclass 
        AND conname = 'ex_agenda_no_solapada'
      `);
      
      if (result.length > 0) {
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
    } catch (error) {}
  }

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
    const [desdeH, desdeM] = horaDesde.split(':').map(Number);
    const [hastaH, hastaM] = horaHasta.split(':').map(Number);
    
    let minutosTotales;
    if (horaHasta <= horaDesde) {
      minutosTotales = (24 * 60 - (desdeH * 60 + desdeM)) + (hastaH * 60 + hastaM);
    } else {
      minutosTotales = (hastaH * 60 + hastaM) - (desdeH * 60 + desdeM);
    }
    
    if (minutosTotales <= 0) {
      throw new BadRequestException(`El horario desde debe ser menor al horario hasta`);
    }
    
    if (bufferMinutos === 0) {
      if (minutosTotales % duracionTurno !== 0) {
        throw new BadRequestException(
          `La duración del turno (${duracionTurno} min) no divide exactamente el rango horario de ${minutosTotales} minutos.`
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
    id?: number,
  ): Promise<void> {
    console.log(`[VERIFICAR] profesionalCentroId: ${profesionalCentroId}, diaSemana: ${diaSemana}, horario: ${horaDesde}-${horaHasta}`);
    
    const agendasExistentes = await this.repository.find({
      where: {
        profesionalCentroId,
        diaSemana,
        fecha_baja: IsNull(),
      },
    });

    console.log(`[VERIFICAR] Encontrados ${agendasExistentes.length} bloques activos para este día`);

    for (const agenda of agendasExistentes) {
      if (id && agenda.id === id) continue;

      console.log(`[VERIFICAR] Nuevo bloque horario: ${horaDesde} a ${horaHasta}`);
      console.log(`[VERIFICAR] Existente bloque horario: ${agenda.horaDesde} a ${agenda.horaHasta}`);

      const haySolapamientoHorario = (
        (horaDesde < agenda.horaHasta && horaHasta > agenda.horaDesde)
      );

      console.log(`[VERIFICAR] ¿Hay solapamiento horario? ${haySolapamientoHorario}`);

      if (haySolapamientoHorario) {
        console.log(`[VERIFICAR] CONFLICTO DETECTADO con bloque ID ${agenda.id}`);
        throw new BadRequestException(
          `No se permite solapamiento de horarios. Ya existe un bloque ACTIVO ` +
          `para este día con horario ${agenda.horaDesde} a ${agenda.horaHasta} ` +
          `(duración ${agenda.duracionTurno} min).`
        );
      }
    }
    
    console.log(`[VERIFICAR] No se detectaron conflictos`);
  }

  // ============================================================
  // MÉTODO MODIFICADO: generarSlots ahora devuelve timezone
  // ============================================================
  async generarSlots(
    profesionalCentroId: number,
    diaSemana: number,
  ): Promise<{ slots: { disponible: boolean; hora: string; bloqueado: boolean }[]; timezone: string }> {
    
    console.log(`[SLOTS] Buscando agenda - profesionalCentroId: ${profesionalCentroId}, diaSemana: ${diaSemana}`);
    
    const agenda = await this.repository.findOne({
      where: {
        profesionalCentroId,
        diaSemana,
        fecha_baja: IsNull(),
      },
    });
    
    if (!agenda) {
      console.log(`[SLOTS] No se encontró agenda para esos parámetros`);
      return { slots: [], timezone: 'America/Argentina/Buenos_Aires' };
    }
    
    console.log(`[SLOTS] Agenda encontrada - ID: ${agenda.id}, timezone: ${agenda.timezone}, duracionTurno: ${agenda.duracionTurno} min, horaDesde: ${agenda.horaDesde}, horaHasta: ${agenda.horaHasta}`);
    
    const slots: { hora: string; bloqueado: boolean }[] = [];
    let horaActual = agenda.horaDesde;
    const horaFin = agenda.horaHasta;
    let contador = 0;
    const maxIteraciones = 100;
    
    while (horaActual < horaFin && contador < maxIteraciones) {
      slots.push({ hora: this.normalizarHora(horaActual), bloqueado: false });
      contador++;
      
      const [h, m] = horaActual.split(':').map(Number);
      let minutos = m + agenda.duracionTurno;
      let horas = h;
      if (minutos >= 60) {
        horas += Math.floor(minutos / 60);
        minutos = minutos % 60;
      }
      horaActual = `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
    }
    
    console.log(`[SLOTS] Generados ${slots.length} slots. Primeros 3: ${slots.slice(0, 3).map(s => s.hora).join(', ')}`);
    
    const excepcionesFechas = await this.excepcionesFechasRepository.find({
      where: {
        profesionalCentroId: profesionalCentroId,
        fecha_baja: IsNull(),
      },
    });
    
    for (const excepcion of excepcionesFechas) {
      if (!excepcion.horaDesde && !excepcion.horaHasta) {
        for (let i = 0; i < slots.length; i++) {
          slots[i].bloqueado = true;
        }
      } else if (excepcion.horaDesde && excepcion.horaHasta) {
        for (let i = 0; i < slots.length; i++) {
          const slotHora = slots[i].hora;
          const exHoraDesde = this.normalizarHora(excepcion.horaDesde);
          const exHoraHasta = this.normalizarHora(excepcion.horaHasta);
          if (slotHora >= exHoraDesde && slotHora < exHoraHasta) {
            slots[i].bloqueado = true;
          }
        }
      }
    }
    
    // 🔹 NUEVO: Devolver slots + timezone
    return {
      slots: slots.map(slot => ({
        ...slot,
        disponible: !slot.bloqueado,
      })),
      timezone: agenda.timezone || 'America/Argentina/Buenos_Aires'
    };
  }

  async generarSlotsPorId(
    profesionalCentroId: number,
    agendaId: number,
  ): Promise<{ disponible: boolean; hora: string; bloqueado: boolean }[]> {
    
    console.log(`[SLOTS] Buscando agenda por ID: ${agendaId}, profesionalCentroId: ${profesionalCentroId}`);
    
    const agenda = await this.repository.findOne({
      where: {
        id: agendaId,
        profesionalCentroId,
        fecha_baja: IsNull(),
      },
    });
    
    if (!agenda) {
      console.log(`[SLOTS] No se encontró agenda para ID ${agendaId} y profesionalCentroId ${profesionalCentroId}`);
      return [];
    }
    
    console.log(`[SLOTS] Agenda encontrada - ID: ${agenda.id}, duracionTurno: ${agenda.duracionTurno} min, horaDesde: ${agenda.horaDesde}, horaHasta: ${agenda.horaHasta}`);
    
    const slots: { hora: string; bloqueado: boolean }[] = [];
    let horaActual = this.normalizarHora(agenda.horaDesde);
    const horaFin = this.normalizarHora(agenda.horaHasta);
    let contador = 0;
    const maxIteraciones = 100;
    
    while (horaActual < horaFin && contador < maxIteraciones) {
      slots.push({ hora: horaActual, bloqueado: false });
      contador++;
      
      const [h, m] = horaActual.split(':').map(Number);
      let minutos = m + agenda.duracionTurno;
      let horas = h;
      if (minutos >= 60) {
        horas += Math.floor(minutos / 60);
        minutos = minutos % 60;
      }
      horaActual = `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
    }
    
    console.log(`[SLOTS] Generados ${slots.length} slots para agenda ID ${agenda.id}. Primeros 3: ${slots.slice(0, 3).map(s => s.hora).join(', ')}`);
    
    const excepcionesFechas = await this.excepcionesFechasRepository.find({
      where: {
        profesionalCentroId: profesionalCentroId,
        fecha_baja: IsNull(),
      },
    });
    
    for (const excepcion of excepcionesFechas) {
      if (!excepcion.horaDesde && !excepcion.horaHasta) {
        for (let i = 0; i < slots.length; i++) {
          slots[i].bloqueado = true;
        }
      } else if (excepcion.horaDesde && excepcion.horaHasta) {
        for (let i = 0; i < slots.length; i++) {
          const slotHora = slots[i].hora;
          const exHoraDesde = this.normalizarHora(excepcion.horaDesde);
          const exHoraHasta = this.normalizarHora(excepcion.horaHasta);
          if (slotHora >= exHoraDesde && slotHora < exHoraHasta) {
            slots[i].bloqueado = true;
          }
        }
      }
    }
    
    return slots.map(slot => ({
      ...slot,
      disponible: !slot.bloqueado,
    }));
  }

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
      where: { profesionalCentroId },
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
    );

    const timezone = await this.obtenerTimezoneDesdeProfesionalCentro(createDto.profesionalCentroId);

    const bloqueActivoExistente = await this.repository.findOne({
      where: {
        profesionalCentroId: createDto.profesionalCentroId,
        diaSemana: createDto.diaSemana,
        horaDesde: createDto.horaDesde,
        horaHasta: createDto.horaHasta,
        duracionTurno: createDto.duracionTurno,
        fecha_baja: IsNull(),
      },
    });

    if (bloqueActivoExistente) {
      bloqueActivoExistente.timezone = timezone;
      Object.assign(bloqueActivoExistente, {
        ...createDto,
        usuario_modificacion: usuario || 'demo',
      });
      return this.repository.save(bloqueActivoExistente);
    }
    
    const existenteEliminado = await this.repository.findOne({
      where: {
        profesionalCentroId: createDto.profesionalCentroId,
        diaSemana: createDto.diaSemana,
        horaDesde: createDto.horaDesde,
        horaHasta: createDto.horaHasta,
        duracionTurno: createDto.duracionTurno,
        fecha_baja: Not(IsNull()),
      },
    });
    
    if (existenteEliminado) {
      existenteEliminado.fecha_baja = null!;
      existenteEliminado.usuario_baja = null!;
      existenteEliminado.usuario_modificacion = usuario || 'demo';
      existenteEliminado.timezone = timezone;
      Object.assign(existenteEliminado, createDto);
      return this.repository.save(existenteEliminado);
    }

    const registro = this.repository.create({
      ...createDto,
      timezone: timezone,
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
      id,
    );

    if (updateDto.profesionalCentroId && updateDto.profesionalCentroId !== registro.profesionalCentroId) {
      const nuevoTimezone = await this.obtenerTimezoneDesdeProfesionalCentro(updateDto.profesionalCentroId);
      registro.timezone = nuevoTimezone;
    }

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

  async activarDesactivarBloques(ids: number[], activar: boolean, usuario?: string): Promise<void> {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('No se recibieron IDs válidos para procesar');
    }
    
    const idsValidos = ids.filter(id => {
      const idNum = Number(id);
      return !isNaN(idNum) && isFinite(idNum) && idNum > 0;
    });
    
    if (idsValidos.length === 0) {
      throw new BadRequestException('No hay IDs válidos en la lista');
    }
    
    if (activar) {
      for (const id of idsValidos) {
        const bloqueAActivar = await this.findOne(id);
        
        if (!bloqueAActivar) {
          throw new BadRequestException(`No se encontró el bloque con ID ${id}`);
        }
        
        if (!bloqueAActivar.fecha_baja) {
          continue;
        }
        
        const horaDesdeNorm = this.normalizarHora(bloqueAActivar.horaDesde);
        const horaHastaNorm = this.normalizarHora(bloqueAActivar.horaHasta);
        
        const bloquesExistentes = await this.repository.find({
          where: {
            profesionalCentroId: bloqueAActivar.profesionalCentroId,
            diaSemana: bloqueAActivar.diaSemana,
            fecha_baja: IsNull(),
          },
        });
        
        for (const bloqueExistente of bloquesExistentes) {
          if (bloqueExistente.id === id) continue;
          
          const horaDesdeExistente = this.normalizarHora(bloqueExistente.horaDesde);
          const horaHastaExistente = this.normalizarHora(bloqueExistente.horaHasta);
          
          const existeSolapamiento = (
            (horaDesdeNorm < horaHastaExistente && horaHastaNorm > horaDesdeExistente)
          );
          
          if (existeSolapamiento) {
            throw new BadRequestException(
              `No se puede activar el bloque porque solapa con otro bloque activo ` +
              `del día ${bloqueExistente.diaSemana} con horario ${horaDesdeExistente} a ${horaHastaExistente}.`
            );
          }
        }
      }
    }
    
    const ahora = new Date();
    const usuarioActual = usuario || 'demo';
    
    if (activar) {
      await this.repository
        .createQueryBuilder()
        .update(AgendaDisponibilidad)
        .set({ 
          fecha_baja: null as any,
          usuario_baja: null as any,
          usuario_modificacion: usuarioActual,
          fecha_modificacion: ahora
        })
        .where('id IN (:...ids)', { ids: idsValidos })
        .execute();
    } else {
      await this.repository
        .createQueryBuilder()
        .update(AgendaDisponibilidad)
        .set({ 
          fecha_baja: ahora,
          usuario_baja: usuarioActual,
          usuario_modificacion: usuarioActual,
          fecha_modificacion: ahora
        })
        .where('id IN (:...ids)', { ids: idsValidos })
        .execute();
    }
  }

  async sincronizarBloque(
    profesionalCentroId: number,
    horaDesde: string,
    horaHasta: string,
    duracionTurno: number,
    fechaDesde: string,
    fechaHasta: string | null,
    diasHabilitados: number[],
    excepcionesHorarios: any[],
    usuario?: string
  ): Promise<void> {
    const horaDesdeNorm = this.normalizarHora(horaDesde);
    const horaHastaNorm = this.normalizarHora(horaHasta);

    const timezone = await this.obtenerTimezoneDesdeProfesionalCentro(profesionalCentroId);

    const bloqueActivo = await this.repository.findOne({
      where: {
        profesionalCentroId,
        horaDesde: horaDesdeNorm,
        horaHasta: horaHastaNorm,
        duracionTurno,
        fecha_baja: IsNull(),
      },
    });

    if (!bloqueActivo) {
      for (const diaSemana of diasHabilitados) {
        const nuevoBloque = this.repository.create({
          profesionalCentroId,
          diaSemana,
          horaDesde: horaDesdeNorm,
          horaHasta: horaHastaNorm,
          duracionTurno,
          bufferMinutos: 0,
          fechaDesde: new Date(fechaDesde),
          fechaHasta: fechaHasta ? new Date(fechaHasta) : null,
          timezone: timezone,
          usuario_alta: usuario || 'demo',
        });
        await this.repository.save(nuevoBloque);
      }
    } else {
      const bloquesActuales = await this.repository.find({
        where: {
          profesionalCentroId,
          horaDesde: horaDesdeNorm,
          horaHasta: horaHastaNorm,
          duracionTurno,
          fecha_baja: IsNull(),
        },
      });
      
      const diasActuales = bloquesActuales.map(b => b.diaSemana);
      
      const diasAAgregar = diasHabilitados.filter(d => !diasActuales.includes(d));
      const diasAEliminar = diasActuales.filter(d => !diasHabilitados.includes(d));
      
      for (const diaSemana of diasAAgregar) {
        const nuevoBloque = this.repository.create({
          profesionalCentroId,
          diaSemana,
          horaDesde: horaDesdeNorm,
          horaHasta: horaHastaNorm,
          duracionTurno,
          bufferMinutos: 0,
          fechaDesde: new Date(fechaDesde),
          fechaHasta: fechaHasta ? new Date(fechaHasta) : null,
          timezone: timezone,
          usuario_alta: usuario || 'demo',
        });
        await this.repository.save(nuevoBloque);
      }
      
      for (const diaSemana of diasAEliminar) {
        const bloqueAEliminar = bloquesActuales.find(b => b.diaSemana === diaSemana);
        if (bloqueAEliminar) {
          bloqueAEliminar.fecha_baja = new Date();
          bloqueAEliminar.usuario_baja = usuario || 'demo';
          await this.repository.save(bloqueAEliminar);
        }
      }
    }
  }
  
  async debugStructure(): Promise<any> {
    return this.repository.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'agenda_disponibilidad';
    `);
  }

  async guardarLote(bloques: any[], usuario: string): Promise<void> {
    const queryRunner = this.repository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    try {
      const inactivos = bloques.filter(b => b.id && b.fecha_baja);
      const activos = bloques.filter(b => b.id && !b.fecha_baja);
      const nuevos = bloques.filter(b => !b.id);
      
      console.log(`[guardarLote] Inactivos: ${inactivos.length}, Activos: ${activos.length}, Nuevos: ${nuevos.length}`);
      
      for (const bloque of inactivos) {
        const existing = await queryRunner.manager.findOne(AgendaDisponibilidad, {
          where: { id: bloque.id }
        });
        
        if (existing) {
          existing.horaDesde = this.normalizarHora(bloque.horaDesde);
          existing.horaHasta = this.normalizarHora(bloque.horaHasta);
          existing.duracionTurno = bloque.duracionTurno;
          existing.fechaDesde = new Date(bloque.fechaDesde);
          existing.fechaHasta = bloque.fechaHasta ? new Date(bloque.fechaHasta) : null;
          existing.usuario_modificacion = usuario;
          existing.fecha_modificacion = new Date();
          
          await queryRunner.manager.save(existing);
          console.log(`[guardarLote] Actualizado bloque INACTIVO ID ${bloque.id}`);
        }
      }
      
      for (const bloque of activos) {
        console.log(`[guardarLote] Validando ACTIVO ID ${bloque.id}, diaSemana=${bloque.diaSemana}, horario=${bloque.horaDesde} a ${bloque.horaHasta}`);
        
        const duplicado = await queryRunner.manager.findOne(AgendaDisponibilidad, {
          where: {
            profesionalCentroId: bloque.profesionalCentroId,
            diaSemana: bloque.diaSemana,
            horaDesde: this.normalizarHora(bloque.horaDesde),
            horaHasta: this.normalizarHora(bloque.horaHasta),
            duracionTurno: bloque.duracionTurno,
            id: Not(Number(bloque.id)),
          },
        });
        
        if (duplicado) {
          throw new BadRequestException(
            `Ya existe un registro con los mismos datos (profesional, día, horario y duración) para el bloque ID ${bloque.id}.`
          );
        }
        
        const solapamiento = await queryRunner.manager.findOne(AgendaDisponibilidad, {
          where: {
            profesionalCentroId: bloque.profesionalCentroId,
            diaSemana: bloque.diaSemana,
            fecha_baja: IsNull(),
            id: Not(Number(bloque.id)),
          },
        });
        
        if (solapamiento) {
          console.log(`[guardarLote] Posible solapamiento con bloque ID ${solapamiento.id}, horario=${solapamiento.horaDesde} a ${solapamiento.horaHasta}`);
          
          const horaDesdeNorm = this.normalizarHora(bloque.horaDesde);
          const horaHastaNorm = this.normalizarHora(bloque.horaHasta);
          const agendaDesdeNorm = this.normalizarHora(solapamiento.horaDesde);
          const agendaHastaNorm = this.normalizarHora(solapamiento.horaHasta);
          
          const solapa = (horaDesdeNorm < agendaHastaNorm && horaHastaNorm > agendaDesdeNorm);
          
          if (solapa) {
            throw new BadRequestException(
              `No se permite solapamiento de horarios. Ya existe un bloque ACTIVO ID ${solapamiento.id} para este día con horario ${agendaDesdeNorm} a ${agendaHastaNorm}.`
            );
          }
        } else {
          console.log(`[guardarLote] No se encontró solapamiento para bloque ID ${bloque.id}`);
        }
        
        const existing = await queryRunner.manager.findOne(AgendaDisponibilidad, {
          where: { id: bloque.id }
        });
        
        if (existing) {
          existing.horaDesde = this.normalizarHora(bloque.horaDesde);
          existing.horaHasta = this.normalizarHora(bloque.horaHasta);
          existing.duracionTurno = bloque.duracionTurno;
          existing.fechaDesde = new Date(bloque.fechaDesde);
          existing.fechaHasta = bloque.fechaHasta ? new Date(bloque.fechaHasta) : null;
          existing.fecha_baja = null!;
          existing.usuario_modificacion = usuario;
          existing.fecha_modificacion = new Date();
          
          await queryRunner.manager.save(existing);
          console.log(`[guardarLote] Actualizado bloque ACTIVO ID ${bloque.id}`);
        }
      }
      
      for (const bloque of nuevos) {
        console.log(`[guardarLote] ===== PROCESANDO NUEVO BLOQUE =====`);
        console.log(`[guardarLote] Datos del nuevo bloque: diaSemana=${bloque.diaSemana}, horario=${bloque.horaDesde} a ${bloque.horaHasta}, duracion=${bloque.duracionTurno}`);
        
        const timezone = await this.obtenerTimezoneDesdeProfesionalCentro(bloque.profesionalCentroId);
        
        const duplicado = await queryRunner.manager.findOne(AgendaDisponibilidad, {
          where: {
            profesionalCentroId: bloque.profesionalCentroId,
            diaSemana: bloque.diaSemana,
            horaDesde: this.normalizarHora(bloque.horaDesde),
            horaHasta: this.normalizarHora(bloque.horaHasta),
            duracionTurno: bloque.duracionTurno,
          },
        });
        
        if (duplicado) {
          if (duplicado.fecha_baja) {
            throw new BadRequestException(
              `Ya existe un bloque INACTIVO con los mismos datos. Por favor, reactívelo desde la interfaz.`
            );
          } else {
            throw new BadRequestException(
              `Ya existe un bloque ACTIVO con el mismo horario y duración.`
            );
          }
        }
        
        const solapamiento = await queryRunner.manager.findOne(AgendaDisponibilidad, {
          where: {
            profesionalCentroId: bloque.profesionalCentroId,
            diaSemana: bloque.diaSemana,
            fecha_baja: IsNull(),
          },
        });
        
        if (solapamiento) {
          const horaDesdeNorm = this.normalizarHora(bloque.horaDesde);
          const horaHastaNorm = this.normalizarHora(bloque.horaHasta);
          const agendaDesdeNorm = this.normalizarHora(solapamiento.horaDesde);
          const agendaHastaNorm = this.normalizarHora(solapamiento.horaHasta);
          
          console.log(`[guardarLote] Bloque existente encontrado: ID=${solapamiento.id}, horario=${agendaDesdeNorm} a ${agendaHastaNorm}`);
          
          const solapa = (horaDesdeNorm < agendaHastaNorm && horaHastaNorm > agendaDesdeNorm);
          
          if (solapa) {
            throw new BadRequestException(
              `No se permite solapamiento de horarios. Ya existe un bloque ACTIVO para este día con horario ${agendaDesdeNorm} a ${agendaHastaNorm}.`
            );
          }
        }
        
        const nuevoBloque = this.repository.create({
          profesionalCentroId: bloque.profesionalCentroId,
          diaSemana: bloque.diaSemana,
          horaDesde: this.normalizarHora(bloque.horaDesde),
          horaHasta: this.normalizarHora(bloque.horaHasta),
          duracionTurno: bloque.duracionTurno,
          bufferMinutos: bloque.bufferMinutos || 0,
          fechaDesde: new Date(bloque.fechaDesde),
          fechaHasta: bloque.fechaHasta ? new Date(bloque.fechaHasta) : null,
          timezone: timezone,
          usuario_alta: usuario,
          fecha_alta: new Date(),
        });
        
        await queryRunner.manager.save(nuevoBloque);
        console.log(`[guardarLote] ✅ Creado nuevo bloque para día ${bloque.diaSemana} con timezone ${timezone}`);
      }
      
      await queryRunner.commitTransaction();
      console.log(`[guardarLote] Transacción completada exitosamente`);
      
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error(`[guardarLote] Error: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
