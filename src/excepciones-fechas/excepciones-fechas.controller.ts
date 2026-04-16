// src/excepciones-fechas/excepciones-fechas.controller.ts
import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param 
} from '@nestjs/common';
import { ExcepcionesFechasService } from './excepciones-fechas.service';
import { ExcepcionFecha } from './entities/excepcion-fecha.entity';
import { CreateExcepcionFechaDto } from './dto/create-excepcion-fecha.dto';
import { UpdateExcepcionFechaDto } from './dto/update-excepcion-fecha.dto';

@Controller('excepciones-fechas')
export class ExcepcionesFechasController {
  constructor(private readonly service: ExcepcionesFechasService) {}

  @Get()
  async findAll(): Promise<any[]> {
    const registros = await this.service.findAll();
    return registros.map(r => this.agregarUltimoMovimiento(r));
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<any> {
    const registro = await this.service.findOne(Number(id));
    return this.agregarUltimoMovimiento(registro);
  }

  @Get('por-agenda/:agendaDisponibilidadId')
  async findByAgenda(@Param('agendaDisponibilidadId') agendaDisponibilidadId: string): Promise<any[]> {
    const registros = await this.service.findByAgenda(Number(agendaDisponibilidadId));
    return registros.map(r => this.agregarUltimoMovimiento(r));
  }

  @Post()
  async create(@Body() createDto: CreateExcepcionFechaDto): Promise<any> {
    const registro = await this.service.create(createDto, 'demo');
    return this.agregarUltimoMovimiento(registro);
  }

  @Put(':id')
  async update(
    @Param('id') id: string, 
    @Body() updateDto: UpdateExcepcionFechaDto
  ): Promise<any> {
    const registro = await this.service.update(Number(id), updateDto, 'demo');
    return this.agregarUltimoMovimiento(registro);
  }

  @Delete(':id')
  softDelete(@Param('id') id: string): Promise<void> {
    return this.service.softDelete(Number(id), 'demo');
  }

  private agregarUltimoMovimiento(registro: ExcepcionFecha): any {
    const obj: any = { ...registro };
    
    let ultimoMovimiento = 'Sin información';
    
    if (registro.fecha_baja && registro.usuario_baja) {
      ultimoMovimiento = `${registro.usuario_baja} - BAJA - ${this.formatearFechaArgentina(registro.fecha_baja)}`;
    } 
    else if (registro.fecha_modificacion && 
             registro.fecha_alta && 
             new Date(registro.fecha_modificacion).getTime() !== new Date(registro.fecha_alta).getTime() && 
             registro.usuario_modificacion) {
      ultimoMovimiento = `${registro.usuario_modificacion} - MODIFICACIÓN - ${this.formatearFechaArgentina(registro.fecha_modificacion)}`;
    } 
    else if (registro.usuario_alta) {
      ultimoMovimiento = `${registro.usuario_alta} - ALTA - ${this.formatearFechaArgentina(registro.fecha_alta)}`;
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
