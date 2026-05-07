import { Controller, Get, Post, Body, Put, Param, Delete, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { NegociosEstadosPagoService } from './negocios-estados-pago.service';
import { CreateNegocioEstadoPagoDto } from './dto/create-negocio-estado-pago.dto';
import { UpdateNegocioEstadoPagoDto } from './dto/update-negocio-estado-pago.dto';
import { NegocioEstadoPago } from './entities/negocio-estado-pago.entity';

@Controller('negocios-estados-pago')
export class NegociosEstadosPagoController {
  constructor(private readonly service: NegociosEstadosPagoService) {}

  // ============================================================
  // LISTAR ESTADOS DE PAGO
  // ============================================================
  @Get()
  async findAll(
    @Query('negocioId') negocioId?: string,
    @Query('soloActivos') soloActivos?: string,
  ): Promise<NegocioEstadoPago[]> {
    const negocioIdNum = negocioId ? parseInt(negocioId, 10) : undefined;
    const soloActivosBool = soloActivos !== 'false';
    return this.service.findAll(negocioIdNum, soloActivosBool);
  }

  // ============================================================
  // LISTAR ESTADOS DE PAGO POR NEGOCIO
  // ============================================================
  @Get('negocio/:negocioId')
  async findByNegocio(
    @Param('negocioId') negocioId: string,
    @Query('soloActivos') soloActivos?: string,
  ): Promise<NegocioEstadoPago[]> {
    const soloActivosBool = soloActivos !== 'false';
    return this.service.findByNegocio(parseInt(negocioId, 10), soloActivosBool);
  }

  // ============================================================
  // OBTENER ESTADOS DE PAGO ACTIVOS (para usar en formularios)
  // ============================================================
  @Get('activos/:negocioId')
  async getEstadosPagoActivos(@Param('negocioId') negocioId: string): Promise<NegocioEstadoPago[]> {
    return this.service.getEstadosPagoActivos(parseInt(negocioId, 10));
  }

  // ============================================================
  // OBTENER UN ESTADO DE PAGO POR ID
  // ============================================================
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<NegocioEstadoPago> {
    return this.service.findOne(parseInt(id, 10));
  }

  // ============================================================
  // CREAR NUEVO ESTADO DE PAGO
  // ============================================================
  @Post()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async create(
    @Body() createDto: CreateNegocioEstadoPagoDto,
    @Query('usuario') usuario?: string,
  ): Promise<NegocioEstadoPago> {
    return this.service.create(createDto, usuario || 'sistema');
  }

  // ============================================================
  // ACTUALIZAR ESTADO DE PAGO
  // ============================================================
  @Put(':id')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateNegocioEstadoPagoDto,
    @Query('usuario') usuario?: string,
  ): Promise<NegocioEstadoPago> {
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
    return { message: 'Estado de pago eliminado correctamente' };
  }
}
