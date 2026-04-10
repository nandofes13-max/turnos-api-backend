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
import { AgendaExcepcionesService } from './agenda-excepciones.service';
import { AgendaExcepcion } from './entities/agenda-excepcion.entity';
import { CreateAgendaExcepcionDto } from './dto/create-agenda-excepcion.dto';
import { UpdateAgendaExcepcionDto } from './dto/update-agenda-excepcion.dto';

@Controller('agenda-excepciones')
export class AgendaExcepcionesController {
  constructor(private readonly service: AgendaExcepcionesService) {}

  // Listar todas las excepciones
  @Get()
  async findAll(): Promise<any[]> {
    const registros = await this.service.findAll();
    return registros.map(r => this.agregarUltimoMovimiento(r));
  }

  // Obtener una excepción por ID
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<any> {
    const registro = await this.service.findOne(Number(id));
    return this.agregarUltimoMovimiento(registro);
  }

  // Obtener excepciones por agenda
  @Get('por-agenda/:agendaDisponibilidadId')
  async findByAgenda(@Param('agendaDisponibilidadId') agendaDisponibilidadId: string): Promise<any[]> {
    const registros = await this.service.findByAgenda(Number(agendaDisponibilidadId));
    return registros.map(r => this.agregarUltimoMovimiento(r));
  }

  // Obtener excepciones por fecha
  @Get('por-fecha/:fecha')
  async findByFecha(@Param('fecha') fecha: string): Promise<any[]> {
    const registros = await this.service.findByFecha(new Date(fecha));
    return registros.map(r => this.agregarUltimoMovimiento(r));
  }

  // Crear nueva excepción
  @Post()
  async create(@Body() createDto: CreateAgendaExcepcionDto): Promise<any> {
    const registro = await this.service.create(createDto, 'demo');
    return this.agregarUltimoMovimiento(registro);
  }

  // Actualizar excepción
  @Put(':id')
  async update(
    @Param('id') id: string, 
    @Body() updateDto: UpdateAgendaExcepcionDto
  ): Promise<any> {
    const registro = await this.service.update(Number(id), updateDto, 'demo');
    return this.agregarUltimoMovimiento(registro);
  }

  // Soft delete
  @Delete(':id')
  softDelete(@Param('id') id: string): Promise<void> {
    return this.service.softDelete(Number(id), 'demo');
  }

  // Debug: ver estructura de tabla
  @Get('debug/structure')
  debugStructure() {
    return this.service.debugStructure();
  }

  // ===== FUNCIÓN AUXILIAR =====
  private agregarUltimoMovimiento(registro: AgendaExcepcion): any {
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
