import { Controller, Post, Body, Get, Param, Put, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { TurnosService } from './turnos.service';
import { CreateTurnoDto } from './dto/create-turno.dto';
import { Turno } from './entities/turno.entity';

@Controller('turnos')
export class TurnosController {
  constructor(private readonly turnosService: TurnosService) {}

  // ============================================================
  // CREAR NUEVO TURNO (RESERVA)
  // ============================================================
  @Post()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async create(@Body() createTurnoDto: CreateTurnoDto): Promise<{ success: boolean; turno: Turno; message: string }> {
    try {
      const turno = await this.turnosService.create(createTurnoDto);
      return {
        success: true,
        turno,
        message: `Turno reservado con éxito. Se ha enviado la confirmación a ${createTurnoDto.email}`,
      };
    } catch (error) {
      throw error;
    }
  }

  // ============================================================
  // CANCELAR TURNO
  // ============================================================
  @Put(':id/cancelar')
  async cancelar(
    @Param('id') id: string,
    @Query('motivo') motivo: string,
    @Query('usuario') usuario: string,
  ): Promise<Turno> {
    return this.turnosService.cancelar(Number(id), motivo || 'No especificado', usuario || 'sistema');
  }

  // ============================================================
  // CONFIRMAR TURNO
  // ============================================================
  @Put(':id/confirmar')
  async confirmar(
    @Param('id') id: string,
    @Query('usuario') usuario: string,
  ): Promise<Turno> {
    return this.turnosService.confirmar(Number(id), usuario || 'sistema');
  }

  // ============================================================
  // TURNOS POR USUARIO (EMAIL)
  // ============================================================
  @Get('usuario/:email')
  async findByUsuario(@Param('email') email: string): Promise<Turno[]> {
    // Primero buscar usuario por email, luego sus turnos
    const { Usuario } = await import('../usuarios/entities/usuario.entity');
    const { InjectDataSource } = await import('@nestjs/typeorm');
    // Simplificado: asumimos que existe un repositorio de usuarios
    // Por ahora, lanzar error si no está implementado
    throw new Error('Endpoint en desarrollo - implementar búsqueda de usuario por email');
  }

  // ============================================================
  // TURNOS POR PROFESIONAL CENTRO
  // ============================================================
  @Get('profesional-centro/:profesionalCentroId')
  async findByProfesionalCentro(@Param('profesionalCentroId') profesionalCentroId: string): Promise<Turno[]> {
    return this.turnosService.findByProfesionalCentro(Number(profesionalCentroId));
  }

  // ============================================================
  // VERIFICAR DISPONIBILIDAD
  // ============================================================
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
}
