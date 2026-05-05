import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ProfesionalCentro } from '../profesional-centro/entities/profesional-centro.entity';
import { ProfesionalEspecialidad } from '../profesional-especialidad/entities/profesional-especialidad.entity';
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
    private readonly agendaDisponibilidadService: AgendaDisponibilidadService,
    private readonly profesionalCentroService: ProfesionalCentroService,
  ) {}

  // ===== FUNCIÓN AUXILIAR: Verificar si una fecha es hoy =====
  private esHoy(fechaStr: string, timezone: string): boolean {
    const hoy = new Date();
    const fechaSlot = new Date(fechaStr);
    
    // Normalizar a las 00:00:00 en la zona horaria especificada
    const hoyStr = hoy.toLocaleDateString('es-AR', { timeZone: timezone });
    const slotStr = fechaSlot.toLocaleDateString('es-AR', { timeZone: timezone });
    
    return hoyStr === slotStr;
  }

  // ===== FUNCIÓN AUXILIAR: Obtener hora actual en una zona horaria =====
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

      const fechaInicio = new Date(desde);
      const fechaFin = new Date(hasta);
      const diasEnRango: Date[] = [];
      let currentDate = new Date(fechaInicio);

      while (currentDate <= fechaFin) {
        diasEnRango.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }

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
      const fechaObj = new Date(fecha);
      const diaSemana = fechaObj.getDay();

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

      const resultados: ProfesionalSlots[] = [];

      for (const pc of profesionalesCentro) {
        try {
          const profEsp = await this.profesionalEspecialidadRepository.findOne({
            where: {
              profesionalId: pc.profesional.id,
              especialidadId: especialidadId,
              fecha_baja: IsNull(),
            },
          });

          const descripcion = profEsp?.descripcion || '';

          // 🔹 NUEVO: Obtener slots + timezone
          const { slots, timezone } = await this.agendaDisponibilidadService.generarSlots(
            pc.id,
            diaSemana,
          );

          if (slots && slots.length > 0) {
            let horariosDisponibles = slots
              .filter(slot => slot.disponible)
              .map(slot => slot.hora);

            // 🔹 FILTRAR SOLO PARA HOY
            if (this.esHoy(fecha, timezone)) {
              const horaActual = this.obtenerHoraActual(timezone);
              const horariosFiltrados = horariosDisponibles.filter(hora => hora > horaActual);
              
              console.log(`[Filtro] Profesional ${pc.profesional.nombre} - Zona horaria: ${timezone}`);
              console.log(`[Filtro] Hora actual: ${horaActual}`);
              console.log(`[Filtro] Slots originales: ${horariosDisponibles.join(', ')}`);
              console.log(`[Filtro] Slots filtrados: ${horariosFiltrados.join(', ')}`);
              
              horariosDisponibles = horariosFiltrados;
            }

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
          console.log(`Profesional ${pc.id} no tiene agenda para día ${diaSemana}`);
          continue;
        }
      }

      return resultados;
    } catch (error) {
      console.error('[AgendaPublica] Error en getProfesionalesSlots:', error);
      throw new BadRequestException(`Error al obtener profesionales y slots: ${error.message}`);
    }
  }
}
