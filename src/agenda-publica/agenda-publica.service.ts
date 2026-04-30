import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ProfesionalCentro } from '../profesional-centro/entities/profesional-centro.entity';
import { AgendaDisponibilidadService } from '../agenda-disponibilidad/agenda-disponibilidad.service';
import { ProfesionalCentroService } from '../profesional-centro/profesional-centro.service';

@Injectable()
export class AgendaPublicaService {
  constructor(
    @InjectRepository(ProfesionalCentro)
    private readonly profesionalCentroRepository: Repository<ProfesionalCentro>,
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
  ): Promise<{ fecha: string; diaSemana: number; disponible: boolean }[]> {
    try {
      // 1. Obtener todos los profesionales_centro que cumplen: centroId + especialidadId
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

      // 2. Generar rango de fechas
      const fechaInicio = new Date(desde);
      const fechaFin = new Date(hasta);
      const diasEnRango: Date[] = [];
      let currentDate = new Date(fechaInicio);

      while (currentDate <= fechaFin) {
        diasEnRango.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // 3. Para cada fecha, verificar si algún profesional tiene agenda activa
      const resultados = [];

      for (const fecha of diasEnRango) {
        const diaSemana = fecha.getDay(); // 0=Domingo, 1=Lunes, ..., 6=Sábado
        const fechaStr = fecha.toISOString().split('T')[0];
        
        let disponible = false;

        // Verificar cada profesional_centro
        for (const pcId of profesionalCentroIds) {
          try {
            // Intentar generar slots para este profesional en esta fecha
            const slots = await this.agendaDisponibilidadService.generarSlots(
              pcId,
              diaSemana,
            );
            if (slots && slots.length > 0) {
              disponible = true;
              break;
            }
          } catch (error) {
            // Si no hay agenda, continúa con el siguiente
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
  ): Promise<any[]> {
    try {
      const fechaObj = new Date(fecha);
      const diaSemana = fechaObj.getDay();
      const fechaStr = fechaObj.toISOString().split('T')[0];

      // 1. Obtener todos los profesionales_centro que cumplen: centroId + especialidadId
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

      // 2. Para cada profesional, obtener sus slots
      const resultados = [];

      for (const pc of profesionalesCentro) {
        try {
          // Generar slots usando el servicio existente
          const slots = await this.agendaDisponibilidadService.generarSlots(
            pc.id,
            diaSemana,
          );

          if (slots && slots.length > 0) {
            // Filtrar solo los disponibles (bloqueado = false)
            const horariosDisponibles = slots
              .filter(slot => slot.disponible)
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
                descripcion: pc.profesional.descripcion || '',
                slots: horariosDisponibles,
              });
            }
          }
        } catch (error) {
          // Si el profesional no tiene agenda para este día, lo omitimos
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
