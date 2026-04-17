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

// Agregar esto al principio del controlador, después de @Controller
console.log('=== AGENDA-DISPONIBILIDAD CONTROLLER CARGADO ===');

@Controller('agenda-disponibilidad')
export class AgendaDisponibilidadController {
  constructor(private readonly service: AgendaDisponibilidadService) {}

  // Listar todas las agendas (activas)
  @Get()
  async findAll(): Promise<any[]> {
    const registros = await this.service.findAll();
    return registros.map(r => this.agregarUltimoMovimiento(r));
  }

  // Obtener una agenda por ID
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<any> {
    const registro = await this.service.findOne(Number(id));
    return this.agregarUltimoMovimiento(registro);
  }

  // Obtener agendas por profesional-centro
  @Get('por-profesional-centro/:profesionalCentroId')
  async findByProfesionalCentro(@Param('profesionalCentroId') profesionalCentroId: string): Promise<any[]> {
    const registros = await this.service.findByProfesionalCentro(Number(profesionalCentroId));
    return registros.map(r => this.agregarUltimoMovimiento(r));
  }

  // 👇 NUEVO ENDPOINT: Generar slots de disponibilidad para una fecha específica
  @Get('generar-slots/:profesionalCentroId')
  async generarSlots(
    @Param('profesionalCentroId') profesionalCentroId: string,
    @Query('fecha') fecha: string,
  ): Promise<any[]> {
    const slots = await this.service.generarSlots(Number(profesionalCentroId), fecha);
    return slots;
  }

  // Crear nueva agenda
  @Post()
  async create(@Body() createDto: CreateAgendaDisponibilidadDto): Promise<any> {
    const registro = await this.service.create(createDto, 'demo');
    return this.agregarUltimoMovimiento(registro);
  }

  // Actualizar agenda
  @Put(':id')
  async update(
    @Param('id') id: string, 
    @Body() updateDto: UpdateAgendaDisponibilidadDto
  ): Promise<any> {
    const registro = await this.service.update(Number(id), updateDto, 'demo');
    return this.agregarUltimoMovimiento(registro);
  }

  // Soft delete
  @Delete(':id')
  softDelete(@Param('id') id: string): Promise<void> {
    return this.service.softDelete(Number(id), 'demo');
  }

  // ============================================================
  // NUEVO ENDPOINT: Activar/Desactivar múltiples bloques por IDs
  // ============================================================
  @Put('activar-desactivar')
  async activarDesactivarBloques(
    @Body() body: { ids: number[]; activar: boolean }
  ) {
    await this.service.activarDesactivarBloques(body.ids, body.activar, 'demo');
    const accion = body.activar ? 'activados' : 'desactivados';
    return { message: `${body.ids.length} bloque(s) ${accion} correctamente` };
  }

  // Debug: ver estructura de tabla
  @Get('debug/structure')
  debugStructure() {
    return this.service.debugStructure();
  }

  // ===== FUNCIÓN AUXILIAR =====
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
