import { Controller, Post, Body, Get, Param, Put, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { TurnosService } from './turnos.service';
import { CreateTurnoDto } from './dto/create-turno.dto';
import { UpdateTurnoDto } from './dto/update-turno.dto';
import { Turno } from './entities/turno.entity';

@Controller('turnos')
export class TurnosController {
  constructor(private readonly turnosService: TurnosService) {}

  // ============================================================
  // LISTAR TURNOS CON FILTROS
  // ============================================================
  @Get()
  async findAll(
    @Query('usuarioId') usuarioId?: string,
    @Query('negocioId') negocioId?: string,
    @Query('actividadId') actividadId?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('profesionalId') profesionalId?: string,
    @Query('especialidadId') especialidadId?: string,
    @Query('centroId') centroId?: string,
    @Query('canalOrigen') canalOrigen?: string,
    @Query('asistio') asistio?: string,
    @Query('estadoTurnoId') estadoTurnoId?: string,
    @Query('estadoPago') estadoPago?: string,
    @Query('pacienteSearch') pacienteSearch?: string,  // 👈 NUEVO
  ): Promise<Turno[]> {
    return this.turnosService.findAll({
      usuarioId: usuarioId ? parseInt(usuarioId, 10) : undefined,
      negocioId: negocioId ? parseInt(negocioId, 10) : undefined,
      actividadId: actividadId ? parseInt(actividadId, 10) : undefined,
      desde,
      hasta,
      profesionalId: profesionalId ? parseInt(profesionalId, 10) : undefined,
      especialidadId: especialidadId ? parseInt(especialidadId, 10) : undefined,
      centroId: centroId ? parseInt(centroId, 10) : undefined,
      canalOrigen,
      asistio: asistio ? asistio === 'true' : undefined,
      estadoTurnoId: estadoTurnoId ? parseInt(estadoTurnoId, 10) : undefined,
      estadoPago,
      pacienteSearch,  // 👈 NUEVO
    });
  }

  @Post()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async create(@Body() createTurnoDto: CreateTurnoDto): Promise<{ success: boolean; turno: Turno; message: string }> {
    const turno = await this.turnosService.create(createTurnoDto);
    return {
      success: true,
      turno,
      message: `Turno reservado con éxito. Se ha enviado la confirmación a ${createTurnoDto.email}`,
    };
  }

  @Put(':id')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async update(
    @Param('id') id: string,
    @Body() updateTurnoDto: UpdateTurnoDto,
    @Query('usuario') usuario: string,
  ): Promise<Turno> {
    return this.turnosService.update(Number(id), updateTurnoDto, usuario || 'sistema');
  }

  @Put(':id/cancelar')
  async cancelar(
    @Param('id') id: string,
    @Query('motivo') motivo: string,
    @Query('usuario') usuario: string,
  ): Promise<Turno> {
    return this.turnosService.cancelar(Number(id), motivo || 'No especificado', usuario || 'sistema');
  }

  @Get('profesional-centro/:profesionalCentroId')
  async findByProfesionalCentro(@Param('profesionalCentroId') profesionalCentroId: string): Promise<Turno[]> {
    return this.turnosService.findByProfesionalCentro(Number(profesionalCentroId));
  }

  @Get('disponibilidad')
  async checkDisponibilidad(
    @Query('profesionalCentroId') profesionalCentroId: string,
    @Query('inicio') inicio: string,
    @Query('fin') fin: string,
  ): Promise<{ disponible: boolean }> {
    try {
      await this.turnosService.validarDisponibilidad(
        Number(profesionalCentroId),
        new Date(inicio),
        new Date(fin),
      );
      return { disponible: true };
    } catch (error) {
      return { disponible: false };
    }
  }

    // ============================================================
  // NUEVO ENDPOINT: Obtener profesionales por centro y especialidad
  // ============================================================
  @Get('profesionales-por-centro-especialidad')
  async getProfesionalesPorCentroEspecialidad(
    @Query('centroId') centroId: string,
    @Query('especialidadId') especialidadId: string,
  ): Promise<any[]> {
    console.log(`[TurnosController] profesionales-por-centro-especialidad - centroId: ${centroId}, especialidadId: ${especialidadId}`);
    return this.turnosService.findProfesionalesPorCentroEspecialidad(
      Number(centroId),
      Number(especialidadId),
    );
  }
}
