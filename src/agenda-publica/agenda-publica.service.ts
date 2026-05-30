import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ProfesionalCentro } from '../profesional-centro/entities/profesional-centro.entity';
import { ProfesionalEspecialidad } from '../profesional-especialidad/entities/profesional-especialidad.entity';
import { Centro } from '../centro/entities/centro.entity';
import { AgendaDisponibilidadService } from '../agenda-disponibilidad/agenda-disponibilidad.service';
import { ProfesionalCentroService } from '../profesional-centro/profesional-centro.service';
import { Turno } from '../turnos/entities/turno.entity';

export interface DiaDisponible {
  fecha: string;
  diaSemana: number;
  disponible: boolean;
}

export interface ProfesionalSlots {
  profesionalId: number;
  nombre: string;
  documento: string;
  foto?: string;
  especialidadId: number;
  centroId: number;
  profesionalCentroId: number;
  descripcion?: string;
  slots: string[];
}

@Injectable()
export class AgendaPublicaService {
  constructor(
    @InjectRepository(ProfesionalCentro)
    private readonly profesionalCentroRepository: Repository<ProfesionalCentro>,
    @InjectRepository(ProfesionalEspecialidad)
    private readonly profesionalEspecialidadRepository: Repository<ProfesionalEspecialidad>,
    @InjectRepository(Centro)
    private readonly centroRepository: Repository<Centro>,
    @InjectRepository(Turno)
    private readonly turnoRepository: Repository<Turno>,
    private readonly agendaDisponibilidadService: AgendaDisponibilidadService,
    private readonly profesionalCentroService: ProfesionalCentroService,
  ) {}

  private fechaStrToDate(fechaStr: string): Date {
    const [year, month, day] = fechaStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  private obtenerFechaActualEnTimezone(timezone: string): string {
    const formatter = new Intl.DateTimeFormat('es-AR', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    const hoyEnTimezone = formatter.format(new Date());
    const [dia, mes, anio] = hoyEnTimezone.split('/');
    return `${anio}-${mes}-${dia}`;
  }

  private esHoy(fechaStr: string, timezone: string): boolean {
    const hoyStr = this.obtenerFechaActualEnTimezone(timezone);
    return hoyStr === fechaStr;
  }

  private obtenerHoraActual(timezone: string): string {
    const ahora = new Date();
    return ahora.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: timezone
    });
  }

  private async obtenerHorariosOcupados(
    profesionalCentroId: number,
    fecha: string,
  ): Promise<string[]> {
    const turnos = await this.turnoRepository.find({
      where: {
        profesionalCentroId: profesionalCentroId,
        fechaTurno: this.fechaStrToDate(fecha),
        fecha_baja: IsNull(),
      },
      select: ['horaInicio'],
    });
    
    return turnos.map(turno => turno.horaInicio.substring(0, 5));
  }

  // ✅ NUEVO MÉTODO: Obtener especialidades por negocio usando agenda_disponibilidad
  async getEspecialidadesPorNegocio(negocioId: number): Promise<any[]> {
    const sql = `
      SELECT DISTINCT 
        e.id, 
        e.nombre
      FROM agenda_disponibilidad ad
      JOIN profesional_centro pc ON pc.id = ad.profesional_centro_id
      JOIN centro c ON c.id = pc.centro_id
      JOIN especialidad e ON e.id = pc.especialidad_id
      WHERE c.negocio_id = $1
        AND ad.fecha_baja IS NULL
        AND pc.fecha_baja IS NULL
        AND c.fecha_baja IS NULL
      ORDER BY e.nombre
    `;
    
    const result = await this.profesionalCentroRepository.query(sql, [negocioId]);
    console.log(`[getEspecialidadesPorNegocio] Negocio ${negocioId}: ${result.length} especialidades encontradas`);
    return result;
  }

  async getDiasDisponibles(
    centroId: number,
    especialidadId: number,
    desde: string,
    hasta: string,
  ): Promise<DiaDisponible[]> {
    try {
      const centro = await this.centroRepository.findOne({
        where: { id: centroId },
      });
      const timezone = centro?.timezone || 'America/Argentina/Buenos_Aires';
      
      const hoyStr = this.obtenerFechaActualEnTimezone(timezone);
      const hoy = this.fechaStrToDate(hoyStr);
      
      console.log(`[DiasDisponibles] Centro ID ${centroId}, timezone: ${timezone}`);
      console.log(`[DiasDisponibles] Hoy en ${timezone}: ${hoyStr}`);
      
      const fechaInicio = this.fechaStrToDate(desde);
      const fechaFin = this.fechaStrToDate(hasta);
      
      const inicioReal = fechaInicio < hoy ? hoy : fechaInicio;
      
      const diasEnRango: Date[] = [];
      let currentDate = new Date(inicioReal);
      
      while (currentDate <= fechaFin) {
        diasEnRango.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      console.log(`[DiasDisponibles] Generando ${diasEnRango.length} días desde ${inicioReal.toISOString().split('T')[0]}`);

      const profesionalesCentro = await this.profesionalCentroRepository.find({
        where: {
          centroId: centroId,
          especialidadId: especialidadId,
          fecha_baja: IsNull(),
        },
        relations: ['profesional'],
      });

      if (profesionalesCentro.length === 0) {
        return [];
      }

      const profesionalCentroIds = profesionalesCentro.map(pc => pc.id);
      const resultados: DiaDisponible[] = [];

      for (const fecha of diasEnRango) {
        const diaSemana = fecha.getDay();
        const fechaStr = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
        let disponible = false;

        for (const pcId of profesionalCentroIds) {
          try {
            const { slots } = await this.agendaDisponibilidadService.generarSlots(
              pcId,
              diaSemana,
            );
            if (slots && slots.length > 0) {
              disponible = true;
              break;
            }
          } catch (error) {
            continue;
          }
        }

        resultados.push({
          fecha: fechaStr,
          diaSemana: diaSemana,
          disponible: disponible,
        });
      }

      return resultados;
    } catch (error) {
      console.error('[AgendaPublica] Error en getDiasDisponibles:', error);
      throw new BadRequestException(`Error al obtener días disponibles: ${error.message}`);
    }
  }

  async getProfesionalesSlots(
    centroId: number,
    especialidadId: number,
    fecha: string,
  ): Promise<ProfesionalSlots[]> {
    try {
      const centro = await this.centroRepository.findOne({
        where: { id: centroId },
      });
      const timezoneCentro = centro?.timezone || 'America/Argentina/Buenos_Aires';
      
      const fechaObj = this.fechaStrToDate(fecha);
      const diaSemana = fechaObj.getDay();

      console.log(`[getProfesionalesSlots] ========================================`);
      console.log(`[getProfesionalesSlots] Centro ID: ${centroId}, Especialidad ID: ${especialidadId}`);
      console.log(`[getProfesionalesSlots] Fecha solicitada: ${fecha}, diaSemana: ${diaSemana}`);
      console.log(`[getProfesionalesSlots] Timezone del centro: ${timezoneCentro}`);

      const profesionalesCentro = await this.profesionalCentroRepository.find({
        where: {
          centroId: centroId,
          especialidadId: especialidadId,
          fecha_baja: IsNull(),
        },
        relations: ['profesional'],
      });

      console.log(`[getProfesionalesSlots] Profesionales encontrados: ${profesionalesCentro.length}`);

      if (profesionalesCentro.length === 0) {
        return [];
      }

      const profesionalesIds = profesionalesCentro.map(pc => pc.id);
      const horariosOcupadosPorProfesional: Map<number, string[]> = new Map();
      
      for (const pcId of profesionalesIds) {
        const ocupados = await this.obtenerHorariosOcupados(pcId, fecha);
        horariosOcupadosPorProfesional.set(pcId, ocupados);
      }

      const resultados: ProfesionalSlots[] = [];

      for (const pc of profesionalesCentro) {
        console.log(`[getProfesionalesSlots] ===== PROCESANDO PROFESIONAL ID: ${pc.id} =====`);
        console.log(`[getProfesionalesSlots] Profesional nombre: ${pc.profesional.nombre}`);
        
        try {
          const profEsp = await this.profesionalEspecialidadRepository.findOne({
            where: {
              profesionalId: pc.profesional.id,
              especialidadId: especialidadId,
              fecha_baja: IsNull(),
            },
          });

          const descripcion = profEsp?.descripcion || '';

          const { slots, timezone } = await this.agendaDisponibilidadService.generarSlots(
            pc.id,
            diaSemana,
          );

          console.log(`[getProfesionalesSlots] Slots recibidos de generarSlots: ${slots.length}`);
          console.log(`[getProfesionalesSlots] Timezone de la agenda: ${timezone}`);
          console.log(`[getProfesionalesSlots] Detalle de slots:`, slots.map(s => `${s.hora} (disponible: ${s.disponible})`));

          if (slots && slots.length > 0) {
            let horariosDisponibles = slots
              .filter(slot => slot.disponible)
              .map(slot => slot.hora);

            console.log(`[getProfesionalesSlots] horariosDisponibles ANTES del filtro:`, horariosDisponibles);

            const tz = timezone || timezoneCentro;
            const esHoyFlag = this.esHoy(fecha, tz);
            console.log(`[getProfesionalesSlots] ¿Es hoy? ${esHoyFlag} (fecha=${fecha}, tz=${tz})`);

            if (esHoyFlag) {
              const horaActual = this.obtenerHoraActual(tz);
              console.log(`[getProfesionalesSlots] ES HOY - Hora actual en ${tz}: ${horaActual}`);
              horariosDisponibles = horariosDisponibles.filter(hora => hora > horaActual);
              console.log(`[getProfesionalesSlots] horariosDisponibles DESPUÉS del filtro de hora actual:`, horariosDisponibles);
            } else {
              console.log(`[getProfesionalesSlots] NO ES HOY - Mostrando todos los slots`);
            }

            const horariosOcupados = horariosOcupadosPorProfesional.get(pc.id) || [];
            const horariosLibres = horariosDisponibles.filter(hora => !horariosOcupados.includes(hora));
            
            console.log(`[getProfesionalesSlots] Horarios ocupados (turnos activos):`, horariosOcupados);
            console.log(`[getProfesionalesSlots] Horarios libres DESPUÉS de filtrar turnos:`, horariosLibres);

            if (horariosLibres.length > 0) {
              resultados.push({
                profesionalId: pc.profesional.id,
                nombre: pc.profesional.nombre,
                documento: pc.profesional.documento,
                foto: pc.profesional.foto,
                especialidadId: especialidadId,
                centroId: centroId,
                profesionalCentroId: pc.id,
                descripcion: descripcion,
                slots: horariosLibres,
              });
            }
          }
        } catch (error) {
          console.log(`[getProfesionalesSlots] Error para profesional ${pc.id}:`, error.message);
          continue;
        }
      }

      console.log(`[getProfesionalesSlots] Resultados finales: ${resultados.length} profesionales con slots`);
      return resultados;
    } catch (error) {
      console.error('[AgendaPublica] Error en getProfesionalesSlots:', error);
      throw new BadRequestException(`Error al obtener profesionales y slots: ${error.message}`);
    }
  }
}
