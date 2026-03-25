import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param 
} from '@nestjs/common';
import { ProfesionalEspecialidadService } from './profesional-especialidad.service';
import { ProfesionalEspecialidad } from './entities/profesional-especialidad.entity';
import { CreateProfesionalEspecialidadDto } from './dto/create-profesional-especialidad.dto';
import { UpdateProfesionalEspecialidadDto } from './dto/update-profesional-especialidad.dto';

@Controller('profesional-especialidad')
export class ProfesionalEspecialidadController {
  constructor(private readonly service: ProfesionalEspecialidadService) {}

  // Listar todas las relaciones
  @Get()
  async findAll(): Promise<any[]> {
    const registros = await this.service.findAll();
    return registros.map(r => this.agregarUltimoMovimiento(r));
  }

  // Obtener una relación por ID
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<any> {
    const registro = await this.service.findOne(Number(id));
    return this.agregarUltimoMovimiento(registro);
  }

  // Obtener relaciones por profesional
  @Get('por-profesional/:profesionalId')
  async findByProfesional(@Param('profesionalId') profesionalId: string): Promise<any[]> {
    const registros = await this.service.findByProfesional(Number(profesionalId));
    return registros.map(r => this.agregarUltimoMovimiento(r));
  }

  // Obtener relaciones por especialidad
  @Get('por-especialidad/:especialidadId')
  async findByEspecialidad(@Param('especialidadId') especialidadId: string): Promise<any[]> {
    const registros = await this.service.findByEspecialidad(Number(especialidadId));
    return registros.map(r => this.agregarUltimoMovimiento(r));
  }

  // Crear nueva relación
  @Post()
  async create(@Body() createDto: CreateProfesionalEspecialidadDto): Promise<any> {
    const registro = await this.service.create(createDto, 'demo');
    return this.agregarUltimoMovimiento(registro);
  }

  // Actualizar relación
  @Put(':id')
  async update(
    @Param('id') id: string, 
    @Body() updateDto: UpdateProfesionalEspecialidadDto
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
  private agregarUltimoMovimiento(registro: ProfesionalEspecialidad): any {
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
