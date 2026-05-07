import { Controller, Get, Post, Body, Put, Param, Delete, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { NegociosEstadosTurnoService } from './negocios-estados-turno.service';
import { CreateNegocioEstadoTurnoDto } from './dto/create-negocio-estado-turno.dto';
import { UpdateNegocioEstadoTurnoDto } from './dto/update-negocio-estado-turno.dto';
import { NegocioEstadoTurno } from './entities/negocio-estado-turno.entity';

@Controller('negocios-estados-turno')
export class NegociosEstadosTurnoController {
  constructor(private readonly service: NegociosEstadosTurnoService) {}

  // ============================================================
  // LISTAR ESTADOS
  // ============================================================
  @Get()
  async findAll(
    @Query('negocioId') negocioId?: string,
    @Query('soloActivos') soloActivos?: string,
  ): Promise<NegocioEstadoTurno[]> {
    const negocioIdNum = negocioId ? parseInt(negocioId, 10) : undefined;
    const soloActivosBool = soloActivos !== 'false';
    return this.service.findAll(negocioIdNum, soloActivosBool);
  }

  // ============================================================
  // LISTAR ESTADOS POR NEGOCIO (para filtros)
  // ============================================================
  @Get('negocio/:negocioId')
  async findByNegocio(
    @Param('negocioId') negocioId: string,
    @Query('soloActivos') soloActivos?: string,
  ): Promise<NegocioEstadoTurno[]> {
    const soloActivosBool = soloActivos !== 'false';
    return this.service.findByNegocio(parseInt(negocioId, 10), soloActivosBool);
  }

  // ============================================================
  // OBTENER ESTADOS DISPONIBLES PARA SLOTS (agenda pública)
  // ============================================================
  @Get('disponibles-slot/:negocioId')
  async getEstadosDisponiblesParaSlot(@Param('negocioId') negocioId: string): Promise<NegocioEstadoTurno[]> {
    return this.service.getEstadosDisponiblesParaSlot(parseInt(negocioId, 10));
  }

  // ============================================================
  // OBTENER ESTADOS PARA CONFIGURACIÓN
  // ============================================================
  @Get('configuracion/:negocioId')
  async getEstadosConfiguracion(@Param('negocioId') negocioId: string): Promise<NegocioEstadoTurno[]> {
    return this.service.getEstadosConfiguracion(parseInt(negocioId, 10));
  }

  // ============================================================
  // OBTENER UN ESTADO POR ID
  // ============================================================
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<NegocioEstadoTurno> {
    return this.service.findOne(parseInt(id, 10));
  }

  // ============================================================
  // CREAR NUEVO ESTADO
  // ============================================================
  @Post()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async create(
    @Body() createDto: CreateNegocioEstadoTurnoDto,
    @Query('usuario') usuario?: string,
  ): Promise<NegocioEstadoTurno> {
    return this.service.create(createDto, usuario || 'sistema');
  }

  // ============================================================
  // ACTUALIZAR ESTADO
  // ============================================================
  @Put(':id')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateNegocioEstadoTurnoDto,
    @Query('usuario') usuario?: string,
  ): Promise<NegocioEstadoTurno> {
    return this.service.update(parseInt(id, 10), updateDto, usuario || 'sistema');
  }

  // ============================================================
  // ELIMINAR (SOFT DELETE)
  // ============================================================
  @Delete(':id')
  async softDelete(
    @Param('id') id: string,
    @Query('usuario') usuario?: string,
  ): Promise<{ message: string }> {
    await this.service.softDelete(parseInt(id, 10), usuario || 'sistema');
    return { message: 'Estado eliminado correctamente' };
  }
}
