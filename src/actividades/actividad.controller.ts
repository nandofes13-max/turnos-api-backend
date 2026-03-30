import { Body, Controller, Get, Param, Post, Put, Delete } from '@nestjs/common';
import { ActividadService } from './actividad.service';
import { Actividad } from './entities/actividad.entity';
import { CreateActividadDto } from './dto/create-actividad.dto';
import { UpdateActividadDto } from './dto/update-actividad.dto';

@Controller('actividades')
export class ActividadController {
  constructor(private readonly service: ActividadService) {}

  @Get()
  async findAll(): Promise<any[]> {
    const actividades = await this.service.findAll();
    return actividades.map(a => this.agregarUltimoMovimiento(a));
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<any> {
    const actividad = await this.service.findOne(Number(id));
    return this.agregarUltimoMovimiento(actividad);
  }

  @Post()
  async create(@Body() createDto: CreateActividadDto): Promise<any> {
    const actividad = await this.service.create(createDto, 'demo');
    return this.agregarUltimoMovimiento(actividad);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDto: UpdateActividadDto): Promise<any> {
    const actividad = await this.service.update(Number(id), updateDto, 'demo');
    return this.agregarUltimoMovimiento(actividad);
  }

  @Delete(':id')
  softDelete(@Param('id') id: string): Promise<void> {
    return this.service.softDelete(Number(id), 'demo');
  }

  // 👇 ENDPOINT TEMPORAL: Generar códigos para actividades existentes
  @Post('generar-codigos')
  async generarCodigos(): Promise<any> {
    const resultado = await this.service.generarCodigosParaExistentes('demo');
    return { 
      message: `Se generaron ${resultado.actualizadas} códigos`,
      ...resultado 
    };
  }

  @Get('debug/structure')
  debugStructure() {
    return this.service.debugStructure();
  }

  private agregarUltimoMovimiento(actividad: Actividad): any {
    const obj: any = { ...actividad };
    
    let ultimoMovimiento = 'Sin información';
    
    if (actividad.fecha_baja && actividad.usuario_baja) {
      ultimoMovimiento = `${actividad.usuario_baja} - BAJA - ${this.formatearFechaArgentina(actividad.fecha_baja)}`;
    } 
    else if (actividad.fecha_modificacion && 
             actividad.fecha_alta && 
             new Date(actividad.fecha_modificacion).getTime() !== new Date(actividad.fecha_alta).getTime() && 
             actividad.usuario_modificacion) {
      ultimoMovimiento = `${actividad.usuario_modificacion} - MODIFICACIÓN - ${this.formatearFechaArgentina(actividad.fecha_modificacion)}`;
    } 
    else if (actividad.usuario_alta) {
      ultimoMovimiento = `${actividad.usuario_alta} - ALTA - ${this.formatearFechaArgentina(actividad.fecha_alta)}`;
    }
    
    obj.ultimoMovimiento = ultimoMovimiento;
    
    return obj;
  }

  private formatearFechaArgentina(fecha: Date): string {
    return new Date(fecha).toLocaleString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).replace(',', '');
  }
}
