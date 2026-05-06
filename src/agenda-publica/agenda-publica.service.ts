import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ProfesionalCentro } from '../profesional-centro/entities/profesional-centro.entity';
import { ProfesionalEspecialidad } from '../profesional-especialidad/entities/profesional-especialidad.entity';
import { Centro } from '../centro/entities/centro.entity';
import { AgendaDisponibilidadService } from '../agenda-disponibilidad/agenda-disponibilidad.service';
import { ProfesionalCentroService } from '../profesional-centro/profesional-centro.service';

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
    private readonly agendaDisponibilidadService: AgendaDisponibilidadService,
    private readonly profesionalCentroService: ProfesionalCentroService,
  ) {}

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
      const hoy = new Date(hoyStr);
      
      console.log(`[DiasDisponibles] Centro ID ${centroId}, timezone: ${timezone}`);
      console.log(`[DiasDisponibles] Hoy en ${timezone}: ${hoyStr}`);
      
      const fechaInicio = new Date(desde);
      const fechaFin = new Date(hasta);
      
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
        const fechaStr = fecha.toISOString().split('T')[0];
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
      
      const fechaObj = new Date(fecha);
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
              console.log(`[getProfesionalesSlots] horariosDisponibles DESPUÉS del filtro:`, horariosDisponibles);
            } else {
              console.log(`[getProfesionalesSlots] NO ES HOY - Mostrando todos los slots`);
            }

            console.log(`[getProfesionalesSlots] horariosDisponibles FINALES:`, horariosDisponibles);

            if (horariosDisponibles.length > 0) {
              resultados.push({
                profesionalId: pc.profesional.id,
                nombre: pc.profesional.nombre,
                documento: pc.profesional.documento,
                foto: pc.profesional.foto,
                especialidadId: especialidadId,
                centroId: centroId,
                profesionalCentroId: pc.id,
                descripcion: descripcion,
                slots: horariosDisponibles,
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
