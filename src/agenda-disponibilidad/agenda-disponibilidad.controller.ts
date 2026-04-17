// src/agenda-disponibilidad/agenda-disponibilidad.controller.ts
import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query 
} from '@nestjs/common';
import { AgendaDisponibilidadService } from './agenda-disponibilidad.service';
import { AgendaDisponibilidad } from './entities/agenda-disponibilidad.entity';
import { CreateAgendaDisponibilidadDto } from './dto/create-agenda-disponibilidad.dto';
import { UpdateAgendaDisponibilidadDto } from './dto/update-agenda-disponibilidad.dto';

console.log('=== AGENDA-DISPONIBILIDAD CONTROLLER CARGADO ===');

@Controller('agenda-disponibilidad')
export class AgendaDisponibilidadController {
  constructor(private readonly service: AgendaDisponibilidadService) {}

  @Get()
  async findAll(): Promise<any[]> {
    console.log('[Controller] findAll - Inicio');
    const registros = await this.service.findAll();
    console.log('[Controller] findAll - Encontrados:', registros.length);
    return registros.map(r => this.agregarUltimoMovimiento(r));
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<any> {
    console.log('[Controller] findOne - ID recibido:', id);
    console.log('[Controller] findOne - Tipo:', typeof id);
    const idNum = Number(id);
    console.log('[Controller] findOne - ID convertido a número:', idNum);
    const registro = await this.service.findOne(idNum);
    return this.agregarUltimoMovimiento(registro);
  }

  @Get('por-profesional-centro/:profesionalCentroId')
  async findByProfesionalCentro(@Param('profesionalCentroId') profesionalCentroId: string): Promise<any[]> {
    console.log('[Controller] findByProfesionalCentro - ID recibido:', profesionalCentroId);
    console.log('[Controller] findByProfesionalCentro - Tipo:', typeof profesionalCentroId);
    const idNum = Number(profesionalCentroId);
    console.log('[Controller] findByProfesionalCentro - ID convertido a número:', idNum);
    console.log('[Controller] findByProfesionalCentro - Es NaN?', isNaN(idNum));
    
    const registros = await this.service.findByProfesionalCentro(idNum);
    console.log('[Controller] findByProfesionalCentro - Registros encontrados:', registros.length);
    return registros.map(r => this.agregarUltimoMovimiento(r));
  }

  @Get('generar-slots/:profesionalCentroId')
  async generarSlots(
    @Param('profesionalCentroId') profesionalCentroId: string,
    @Query('fecha') fecha: string,
  ): Promise<any[]> {
    console.log('[Controller] generarSlots - ID:', profesionalCentroId, 'Fecha:', fecha);
    const slots = await this.service.generarSlots(Number(profesionalCentroId), fecha);
    return slots;
  }

  @Post()
  async create(@Body() createDto: CreateAgendaDisponibilidadDto): Promise<any> {
    console.log('[Controller] create - Inicio');
    const registro = await this.service.create(createDto, 'demo');
    return this.agregarUltimoMovimiento(registro);
  }

  @Put(':id')
  async update(
    @Param('id') id: string, 
    @Body() updateDto: UpdateAgendaDisponibilidadDto
  ): Promise<any> {
    console.log('[Controller] update - ID:', id);
    const registro = await this.service.update(Number(id), updateDto, 'demo');
    return this.agregarUltimoMovimiento(registro);
  }

  @Delete(':id')
  softDelete(@Param('id') id: string): Promise<void> {
    console.log('[Controller] softDelete - ID:', id);
    return this.service.softDelete(Number(id), 'demo');
  }

  @Put('activar-desactivar')
  async activarDesactivarBloques(
    @Body() body: { ids: number[]; activar: boolean }
  ) {
    console.log('[Controller] activarDesactivarBloques - Body recibido:', JSON.stringify(body));
    console.log('[Controller] IDs:', body.ids);
    console.log('[Controller] Activar:', body.activar);
    
    await this.service.activarDesactivarBloques(body.ids, body.activar, 'demo');
    const accion = body.activar ? 'activados' : 'desactivados';
    console.log('[Controller] activarDesactivarBloques - Completado');
    return { message: `${body.ids.length} bloque(s) ${accion} correctamente` };
  }

  @Get('debug/structure')
  debugStructure() {
    console.log('[Controller] debugStructure');
    return this.service.debugStructure();
  }

  private agregarUltimoMovimiento(registro: AgendaDisponibilidad): any {
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
