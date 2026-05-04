import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ProfesionalCentro } from '../profesional-centro/entities/profesional-centro.entity';
import { ProfesionalEspecialidad } from '../profesional-especialidad/entities/profesional-especialidad.entity';
import { AgendaDisponibilidadService } from '../agenda-disponibilidad/agenda-disponibilidad.service';
import { ProfesionalCentroService } from '../profesional-centro/profesional-centro.service';

// Exportamos las interfaces para que el controlador pueda usarlas
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

  // ============================================================
  // ENDPOINT 1: Obtener días disponibles (con disponibilidad)
  // ============================================================
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
            const slots = await this.agendaDisponibilidadService.generarSlots(
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

  // ============================================================
  // ENDPOINT 2: Obtener profesionales y slots para un día específico
  // ============================================================
  async getProfesionalesSlots(
  centroId: number,
  especialidadId: number,
  fecha: string,
): Promise<ProfesionalSlots[]> {
  try {
    const fechaObj = new Date(fecha);
    const diaSemana = fechaObj.getDay();

    // Obtener hora actual en minutos (para filtrar slots pasados)
    const ahora = new Date();
    const horaActualNum = ahora.getHours() * 60 + ahora.getMinutes();

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

        const slots = await this.agendaDisponibilidadService.generarSlots(
          pc.id,
          diaSemana,
        );

        if (slots && slots.length > 0) {
          // Filtrar slots por hora actual y disponibilidad
          const horariosDisponibles = slots
            .filter(slot => {
              if (!slot.disponible) return false;
              const [h, m] = slot.hora.split(':').map(Number);
              const slotMinutos = h * 60 + m;
              return slotMinutos > horaActualNum;
            })
            .map(slot => slot.hora);

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
}  }
}
