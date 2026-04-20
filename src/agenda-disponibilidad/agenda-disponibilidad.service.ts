// src/agenda-disponibilidad/agenda-disponibilidad.service.ts
import { Injectable, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not, LessThanOrEqual, In } from 'typeorm';
import { AgendaDisponibilidad } from './entities/agenda-disponibilidad.entity';
import { CreateAgendaDisponibilidadDto } from './dto/create-agenda-disponibilidad.dto';
import { UpdateAgendaDisponibilidadDto } from './dto/update-agenda-disponibilidad.dto';
import { ProfesionalCentro } from '../profesional-centro/entities/profesional-centro.entity';
import { ExcepcionRecurrente } from '../excepciones-recurrentes/entities/excepcion-recurrente.entity';

@Injectable()
export class AgendaDisponibilidadService implements OnModuleInit {
  constructor(
    @InjectRepository(AgendaDisponibilidad)
    private readonly repository: Repository<AgendaDisponibilidad>,
    @InjectRepository(ProfesionalCentro)
    private readonly profesionalCentroRepository: Repository<ProfesionalCentro>,
    @InjectRepository(ExcepcionRecurrente)
    private readonly excepcionesRecurrentesRepository: Repository<ExcepcionRecurrente>,
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

  // ============================================================
// FUNCIÓN AUXILIAR: Validar solapamiento con CUALQUIER bloque (activo o inactivo)
// ============================================================
private async validarSolapamientoConCualquierBloque(
  profesionalCentroId: number,
  diaSemana: number,
  horaDesde: string,
  horaHasta: string,
  duracionTurno: number,
  bloqueIdAActivar?: number  // opcional, para excluir el propio bloque
): Promise<void> {
  // Buscar TODOS los bloques para este profesional-centro y día (sin filtrar por fecha_baja)
  const bloquesExistentes = await this.repository.find({
    where: {
      profesionalCentroId,
      diaSemana,
    },
  });
  
  // 👇 LOGS AGREGADOS
  console.log(`[Service] validarSolapamiento - Día ${diaSemana}, horario ${horaDesde} a ${horaHasta}, duración ${duracionTurno}`);
  console.log(`[Service] Bloques existentes en BD:`, bloquesExistentes.map(b => ({
    id: b.id,
    horaDesde: b.horaDesde,
    horaHasta: b.horaHasta,
    duracionTurno: b.duracionTurno,
    fecha_baja: b.fecha_baja
  })));
  
  for (const bloqueExistente of bloquesExistentes) {
    // Si es el mismo bloque que estamos activando/creando, saltar
    if (bloqueIdAActivar && bloqueExistente.id === bloqueIdAActivar) continue;
    
    // Normalizar horas del bloque existente
    const horaDesdeExistente = this.normalizarHora(bloqueExistente.horaDesde);
    const horaHastaExistente = this.normalizarHora(bloqueExistente.horaHasta);
    const duracionExistente = bloqueExistente.duracionTurno;
    
    // 👇 LOG DE COMPARACIÓN
    console.log(`[Service] Comparando con bloque ID ${bloqueExistente.id}: ${horaDesdeExistente}-${horaHastaExistente} (dur ${duracionExistente})`);
    
    // Si es el MISMO bloque lógico (mismo horario y duración), NO validar solapamiento
    const esMismoBloqueLogico = (
      horaDesdeExistente === horaDesde &&
      horaHastaExistente === horaHasta &&
      duracionExistente === duracionTurno
    );
    
    if (esMismoBloqueLogico) {
      console.log(`[Service] Bloque ID ${bloqueExistente.id} es el mismo bloque lógico, se omite validación`);
      continue;
    }
    
    // Verificar solapamiento de horarios
    const existeSolapamiento = (
      (horaDesde < horaHastaExistente && horaHasta > horaDesdeExistente)
    );
    
    console.log(`[Service] ¿Solapa? ${existeSolapamiento}`);
    
    if (existeSolapamiento) {
      throw new BadRequestException(
        `Bloque ID ${bloqueExistente.id} (${horaDesdeExistente} a ${horaHastaExistente}) solapa con el bloque ` +
        `que intenta guardar (${horaDesde} a ${horaHasta}). Por favor verifique.`
      );
    }
  }
  
  console.log(`[Service] Validación de solapamiento superada para día ${diaSemana}`);
}
  async onModuleInit() {
    // await this.crearConstraintExclusion();  // Constraint eliminada, validación en backend
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
    fechaDesde: Date,
    fechaHasta: Date | null,
    id?: number,
  ): Promise<void> {
    // Este método se mantiene por compatibilidad, pero la nueva validación está en validarSolapamientoConCualquierBloque
    await this.validarSolapamientoConCualquierBloque(profesionalCentroId, diaSemana, horaDesde, horaHasta, id);
  }

  async generarSlots(
    profesionalCentroId: number,
    fecha: string,
  ): Promise<{ disponible: boolean; hora: string; bloqueado: boolean }[]> {
    console.log('[Service] generarSlots - profesionalCentroId:', profesionalCentroId, 'fecha:', fecha);
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
      console.log('[Service] generarSlots - No se encontró agenda');
      return [];
    }
    
    console.log('[Service] generarSlots - Agenda encontrada ID:', agenda.id);
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
    
    const excepcionesRecurrentes = await this.excepcionesRecurrentesRepository.find({
      where: {
        agendaDisponibilidadId: agenda.id,
        diaSemana: diaSemana,
        fecha_baja: IsNull(),
      },
    });
    
    console.log('[Service] generarSlots - Excepciones recurrentes encontradas:', excepcionesRecurrentes.length);
    
    for (const excepcion of excepcionesRecurrentes) {
      if (excepcion.horaDesde && excepcion.horaHasta) {
        for (let i = 0; i < slots.length; i++) {
          const slotHora = slots[i].hora;
          if (slotHora >= excepcion.horaDesde && slotHora < excepcion.horaHasta) {
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
    console.log('[Service] findAll - Inicio');
    const result = await this.repository.find({
      relations: ['profesionalCentro', 'profesionalCentro.profesional', 'profesionalCentro.especialidad', 'profesionalCentro.centro'],
      where: { fecha_baja: IsNull() },
    });
    console.log('[Service] findAll - Encontrados:', result.length);
    return result;
  }

  async findOne(id: number): Promise<AgendaDisponibilidad> {
    console.log('[Service] findOne - ID recibido:', id);
    console.log('[Service] findOne - Tipo:', typeof id);
    console.log('[Service] findOne - Es NaN?', isNaN(id));
    
    const registro = await this.repository.findOne({
      where: { id },
      relations: ['profesionalCentro', 'profesionalCentro.profesional', 'profesionalCentro.especialidad', 'profesionalCentro.centro'],
    });

    if (!registro) {
      console.log('[Service] findOne - No encontrado para ID:', id);
      throw new NotFoundException(`Agenda con id ${id} no encontrada`);
    }

    console.log('[Service] findOne - Encontrado ID:', registro.id);
    return registro;
  }

  async findByProfesionalCentro(profesionalCentroId: number): Promise<AgendaDisponibilidad[]> {
    console.log('[Service] findByProfesionalCentro - ID recibido:', profesionalCentroId);
    console.log('[Service] findByProfesionalCentro - Tipo:', typeof profesionalCentroId);
    console.log('[Service] findByProfesionalCentro - Es NaN?', isNaN(profesionalCentroId));
    
    const result = await this.repository.find({
      where: { profesionalCentroId },
      relations: ['profesionalCentro'],
    });
    console.log('[Service] findByProfesionalCentro - Resultados encontrados (activos + inactivos):', result.length);
    return result;
  }

  async create(createDto: CreateAgendaDisponibilidadDto, usuario?: string): Promise<AgendaDisponibilidad> {
    console.log('[Service] create - Inicio');
    
    createDto.horaDesde = this.normalizarHora(createDto.horaDesde);
    createDto.horaHasta = this.normalizarHora(createDto.horaHasta);
    
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

    const bloqueActivoExistente = await this.repository.findOne({
      where: {
        profesionalCentroId: createDto.profesionalCentroId,
        horaDesde: createDto.horaDesde,
        horaHasta: createDto.horaHasta,
        duracionTurno: createDto.duracionTurno,
        fecha_baja: IsNull(),
      },
    });

    if (bloqueActivoExistente) {
      throw new BadRequestException('Ya existe un bloque activo con el mismo horario y duración');
    }

    const existenteActivo = await this.repository.findOne({
      where: {
        profesionalCentroId: createDto.profesionalCentroId,
        diaSemana: createDto.diaSemana,
        horaDesde: createDto.horaDesde,
        horaHasta: createDto.horaHasta,
        duracionTurno: createDto.duracionTurno,
        fechaDesde: createDto.fechaDesde,
        fechaHasta: createDto.fechaHasta || IsNull(),
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
    
    const existenteEliminado = await this.repository.findOne({
      where: {
        profesionalCentroId: createDto.profesionalCentroId,
        diaSemana: createDto.diaSemana,
        horaDesde: createDto.horaDesde,
        horaHasta: createDto.horaHasta,
        duracionTurno: createDto.duracionTurno,
        fechaDesde: createDto.fechaDesde,
        fechaHasta: createDto.fechaHasta || IsNull(),
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
    console.log('[Service] update - ID:', id);
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
    console.log('[Service] softDelete - ID:', id);
    const registro = await this.findOne(id);
    
    if (registro.fecha_baja) {
      throw new BadRequestException('La agenda ya está inactiva');
    }

    registro.fecha_baja = new Date();
    registro.usuario_baja = usuario || 'demo';

    await this.repository.save(registro);
  }

  async activarDesactivarBloques(ids: number[], activar: boolean, usuario?: string): Promise<void> {
    console.log('[Service] activarDesactivarBloques - INICIO');
    console.log('[Service] IDs recibidos:', ids);
    console.log('[Service] Tipo de ids:', typeof ids);
    console.log('[Service] Es array?', Array.isArray(ids));
    console.log('[Service] Activar:', activar);
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      console.log('[Service] ERROR: No se recibieron IDs válidos');
      throw new BadRequestException('No se recibieron IDs válidos para procesar');
    }
    
    const idsValidos = ids.filter(id => {
      const idNum = Number(id);
      const esValido = !isNaN(idNum) && isFinite(idNum) && idNum > 0;
      if (!esValido) {
        console.log('[Service] ID inválido detectado:', id, 'convertido a:', idNum);
      }
      return esValido;
    });
    
    console.log('[Service] IDs válidos después del filtro:', idsValidos);
    
    if (idsValidos.length === 0) {
      console.log('[Service] ERROR: No hay IDs válidos en la lista');
      throw new BadRequestException('No hay IDs válidos en la lista. IDs recibidos: ' + JSON.stringify(ids));
    }
    
    // ============================================================
    // SI ES ACTIVACIÓN, VALIDAR SOLAPAMIENTO ANTES DE ACTIVAR
    // ============================================================
    if (activar) {
      console.log('[Service] Modo: ACTIVAR - Validando solapamiento antes de activar...');
      
      // Obtener el primer bloque para conocer sus datos
      const primerId = idsValidos[0];
      const bloqueAActivar = await this.findOne(primerId);
      
      if (!bloqueAActivar) {
        throw new BadRequestException(`No se encontró el bloque con ID ${primerId}`);
      }
      
      const horaDesdeNorm = this.normalizarHora(bloqueAActivar.horaDesde);
      const horaHastaNorm = this.normalizarHora(bloqueAActivar.horaHasta);
      
      // Validar solapamiento para el día de este bloque
      await this.validarSolapamientoConCualquierBloque(
        bloqueAActivar.profesionalCentroId,
        bloqueAActivar.diaSemana,
        horaDesdeNorm,
        horaHastaNorm,
        primerId  // excluir el propio bloque
      );
      
      console.log('[Service] Validación de solapamiento superada, procediendo a activar...');
    }
    
    const ahora = new Date();
    const usuarioActual = usuario || 'demo';
    
    console.log('[Service] Ejecutando update para', idsValidos.length, 'IDs');
    
    if (activar) {
      console.log('[Service] Modo: ACTIVAR (fecha_baja = null)');
      const result = await this.repository
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
      console.log('[Service] Resultado de update:', result);
    } else {
      console.log('[Service] Modo: DESACTIVAR (fecha_baja = ahora)');
      const result = await this.repository
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
      console.log('[Service] Resultado de update:', result);
    }
    
    console.log(`[Service] ✅ ${activar ? 'Activados' : 'Desactivados'} ${idsValidos.length} bloques correctamente`);
  }

  // ============================================================
  // MÉTODO: Sincronizar bloque (actualizar días y excepciones) CON VALIDACIÓN DE SOLAPAMIENTO
  // ============================================================
  async sincronizarBloque(
    profesionalCentroId: number,
    horaDesde: string,
    horaHasta: string,
    duracionTurno: number,
    fechaDesde: string,
    fechaHasta: string | null,
    diasHabilitados: number[],
    excepcionesHorarios: { diaSemana: number; horaDesde: string; horaHasta: string }[],
    usuario?: string
  ): Promise<void> {
    console.log('[Service] sincronizarBloque - INICIO');
    
    const horaDesdeNorm = this.normalizarHora(horaDesde);
    const horaHastaNorm = this.normalizarHora(horaHasta);
    
    const excepcionesNorm = excepcionesHorarios.map(exc => ({
      ...exc,
      horaDesde: this.normalizarHora(exc.horaDesde),
      horaHasta: this.normalizarHora(exc.horaHasta),
    }));
    
    console.log('[Service] profesionalCentroId:', profesionalCentroId);
    console.log('[Service] horaDesde:', horaDesdeNorm, 'horaHasta:', horaHastaNorm, 'duracionTurno:', duracionTurno);
    console.log('[Service] diasHabilitados:', diasHabilitados);
    console.log('[Service] excepcionesHorarios:', excepcionesNorm);

    // ============================================================
    // VALIDACIÓN DE SOLAPAMIENTO (antes de cualquier operación)
    // ============================================================
    console.log('[Service] Validando solapamiento para los días habilitados...');
    
    for (const diaSemana of diasHabilitados) {
      await this.validarSolapamientoConCualquierBloque(
        profesionalCentroId,
        diaSemana,
        horaDesdeNorm,
        horaHastaNorm
      );
    }
    
    console.log('[Service] Validación de solapamiento superada, continuando...');

    // 1. Buscar el bloque lógico activo
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
      console.log('[Service] No existe bloque activo, creando nuevo...');
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
      console.log('[Service] Bloque activo encontrado ID:', bloqueActivo.id);
      
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
      console.log('[Service] Días actuales:', diasActuales);
      
      const diasAAgregar = diasHabilitados.filter(d => !diasActuales.includes(d));
      const diasAEliminar = diasActuales.filter(d => !diasHabilitados.includes(d));
      
      console.log('[Service] Días a agregar:', diasAAgregar);
      console.log('[Service] Días a eliminar:', diasAEliminar);
      
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
        console.log(`[Service] Día ${diaSemana} agregado`);
      }
      
      for (const diaSemana of diasAEliminar) {
        const bloqueAEliminar = bloquesActuales.find(b => b.diaSemana === diaSemana);
        if (bloqueAEliminar) {
          bloqueAEliminar.fecha_baja = new Date();
          bloqueAEliminar.usuario_baja = usuario || 'demo';
          await this.repository.save(bloqueAEliminar);
          console.log(`[Service] Día ${diaSemana} eliminado`);
        }
      }
      
      const excepcionesActuales = await this.excepcionesRecurrentesRepository.find({
        where: {
          agendaDisponibilidadId: In(bloquesActuales.map(b => b.id)),
          fecha_baja: IsNull(),
        },
      });
      
      console.log('[Service] Excepciones actuales:', excepcionesActuales.length);
      
      const excepcionesActualesKey = new Set(
        excepcionesActuales.map(e => `${e.diaSemana}|${e.horaDesde}|${e.horaHasta}`)
      );
      
      const nuevasExcepcionesKey = new Set(
        excepcionesNorm.map(e => `${e.diaSemana}|${e.horaDesde}|${e.horaHasta}`)
      );
      
      for (const excepcion of excepcionesActuales) {
        const key = `${excepcion.diaSemana}|${excepcion.horaDesde}|${excepcion.horaHasta}`;
        if (!nuevasExcepcionesKey.has(key)) {
          await this.excepcionesRecurrentesRepository.softDelete(excepcion.id);
          console.log(`[Service] Excepción eliminada: ${key}`);
        }
      }
      
      for (const excepcion of excepcionesNorm) {
        const key = `${excepcion.diaSemana}|${excepcion.horaDesde}|${excepcion.horaHasta}`;
        if (!excepcionesActualesKey.has(key)) {
          const agendaId = bloquesActuales.find(b => b.diaSemana === excepcion.diaSemana)?.id;
          if (agendaId) {
            const nuevaExcepcion = this.excepcionesRecurrentesRepository.create({
              agendaDisponibilidadId: agendaId,
              diaSemana: excepcion.diaSemana,
              horaDesde: excepcion.horaDesde,
              horaHasta: excepcion.horaHasta,
              tipo: 'deshabilitado',
              usuario_alta: usuario || 'demo',
            });
            await this.excepcionesRecurrentesRepository.save(nuevaExcepcion);
            console.log(`[Service] Excepción agregada: ${key}`);
          }
        }
      }
    }
    
    console.log('[Service] sincronizarBloque - FINALIZADO');
  }
  
  async debugStructure(): Promise<any> {
    return this.repository.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'agenda_disponibilidad';
    `);
  }
}
