import { Controller, Get, Query } from '@nestjs/common';
import { AgendaPublicaService } from './agenda-publica.service';

@Controller('agenda-publica')
export class AgendaPublicaController {
  constructor(private readonly service: AgendaPublicaService) {}

  // ============================================================
  // ENDPOINT 1: Obtener días disponibles (con disponibilidad)
  // ============================================================
  @Get('dias-disponibles')
  async getDiasDisponibles(
    @Query('centroId') centroId: string,
    @Query('especialidadId') especialidadId: string,
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
  ) {
    console.log(`[AgendaPublica] dias-disponibles - centroId: ${centroId}, especialidadId: ${especialidadId}, desde: ${desde}, hasta: ${hasta}`);
    return this.service.getDiasDisponibles(
      Number(centroId),
      Number(especialidadId),
      desde,
      hasta,
    );
  }

  // ============================================================
  // ENDPOINT 2: Obtener profesionales y slots para un día específico
  // ============================================================
  @Get('profesionales-slots')
  async getProfesionalesSlots(
    @Query('centroId') centroId: string,
    @Query('especialidadId') especialidadId: string,
    @Query('fecha') fecha: string,
  ) {
    console.log(`[AgendaPublica] profesionales-slots - centroId: ${centroId}, especialidadId: ${especialidadId}, fecha: ${fecha}`);
    return this.service.getProfesionalesSlots(
      Number(centroId),
      Number(especialidadId),
      fecha,
    );
  }
}
