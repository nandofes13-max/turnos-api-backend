// src/agenda-disponibilidad/agenda-disponibilidad.service.ts
import { Injectable, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not, LessThanOrEqual, In } from 'typeorm';
import { AgendaDisponibilidad } from './entities/agenda-disponibilidad.entity';
import { CreateAgendaDisponibilidadDto } from './dto/create-agenda-disponibilidad.dto';
import { UpdateAgendaDisponibilidadDto } from './dto/update-agenda-disponibilidad.dto';
import { ProfesionalCentro } from '../profesional-centro/entities/profesional-centro.entity';
import { ExcepcionFecha } from '../excepciones-fechas/entities/excepcion-fecha.entity';

@Injectable()
export class AgendaDisponibilidadService implements OnModuleInit {
  constructor(
    @InjectRepository(AgendaDisponibilidad)
    private readonly repository: Repository<AgendaDisponibilidad>,
    @InjectRepository(ProfesionalCentro)
    private readonly profesionalCentroRepository: Repository<ProfesionalCentro>,
    @InjectRepository(ExcepcionFecha)
    private readonly excepcionesFechasRepository: Repository<ExcepcionFecha>,
  ) {}

  private normalizarHora(hora: string): string {
    if (!hora) return hora;
    if (hora.length > 5) {
      return hora.slice(0, 5);
    }
    return hora;
  }

  async onModuleInit() {
    // await this.crearConstraintExclusion();
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
    } catch (error) {
      // silent
    }
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

  // ============================================================
  // VERIFICAR SOLAPAMIENTO - SIMPLIFICADO (sin fechas)
  // ============================================================
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

      console.log(`[VERIFICAR] Comparando con bloque ID ${agenda.id}, horario: ${agenda.horaDesde}-${agenda.horaHasta}, duración: ${agenda.duracionTurno}`);

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
  // MÉTODO GENERAR SLOTS - MODIFICADO (recibe diaSemana, no fecha)
  // ============================================================
  async generarSlots(
    profesionalCentroId: number,
    diaSemana: number,  // Ahora recibe el día directamente
  ): Promise<{ disponible: boolean; hora: string; bloqueado: boolean }[]> {
    
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
      return [];
    }
    
    console.log(`[SLOTS] Agenda encontrada - ID: ${agenda.id}, duracionTurno: ${agenda.duracionTurno} min, horaDesde: ${agenda.horaDesde}, horaHasta: ${agenda.horaHasta}`);
    
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
    
    // Excepciones de fechas (por ahora se mantienen, pero idealmente también deberían modificarse)
    const excepcionesFechas = await this.excepcionesFechasRepository.find({
      where: {
        profesionalCentroId: profesionalCentroId,
        fecha_baja: IsNull(),
      },
    });
    
    // Para las excepciones, como no tenemos fecha, solo aplicamos las que no tienen fecha específica
    // o las que aplican para todos los días. Esto se puede mejorar después.
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

  // ============================================================
  // NUEVO MÉTODO: Generar slots por ID de agenda (preciso)
  // ============================================================
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
    
    // Validar solapamiento (sin fechas)
    await this.verificarSolapamiento(
      createDto.profesionalCentroId,
      createDto.diaSemana,
      createDto.horaDesde,
      createDto.horaHasta,
    );

    // Buscar bloque ACTIVO con misma duración (para rechazar)
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
      throw new BadRequestException('Ya existe un bloque activo con el mismo horario y duración');
    }

    // Buscar bloque EXISTENTE ACTIVO (mismos 5 campos clave, sin fechas)
    const existenteActivo = await this.repository.findOne({
      where: {
        profesionalCentroId: createDto.profesionalCentroId,
        diaSemana: createDto.diaSemana,
        horaDesde: createDto.horaDesde,
        horaHasta: createDto.horaHasta,
        duracionTurno: createDto.duracionTurno,
        fecha_baja: IsNull(),
      },
    });
    
    if (existenteActivo) {
      Object.assign(existenteActivo, {
        ...createDto,
        usuario_modificacion: usuario || 'demo',
      });
      return this.repository.save(existenteActivo);
    }
    
    // Buscar bloque EXISTENTE ELIMINADO (inactivo) con misma duración
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
      Object.assign(existenteEliminado, createDto);
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
    
    // Validar solapamiento (sin fechas)
    await this.verificarSolapamiento(
      profesionalCentroId,
      diaSemana,
      horaDesde,
      horaHasta,
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
}
