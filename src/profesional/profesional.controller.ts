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
import { ProfesionalService } from './profesional.service';
import { Profesional } from './entities/profesional.entity';
import { CreateProfesionalDto } from './dto/create-profesional.dto';
import { UpdateProfesionalDto } from './dto/update-profesional.dto';

@Controller('profesionales')
export class ProfesionalController {
  constructor(private readonly service: ProfesionalService) {}

  // Listar todos los profesionales
  @Get()
  async findAll(): Promise<any[]> {
    const profesionales = await this.service.findAll();
    return profesionales.map(p => this.agregarUltimoMovimiento(p));
  }

  // Obtener un profesional por ID
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<any> {
    const profesional = await this.service.findOne(Number(id));
    return this.agregarUltimoMovimiento(profesional);
  }

  // Crear nuevo profesional
  @Post()
  async create(@Body() createDto: CreateProfesionalDto): Promise<any> {
    const profesional = await this.service.create(createDto, 'demo');
    return this.agregarUltimoMovimiento(profesional);
  }

  // Actualizar profesional
  @Put(':id')
  async update(
    @Param('id') id: string, 
    @Body() updateDto: UpdateProfesionalDto
  ): Promise<any> {
    const profesional = await this.service.update(Number(id), updateDto, 'demo');
    return this.agregarUltimoMovimiento(profesional);
  }

  // Soft delete (dar de baja)
  @Delete(':id')
  async softDelete(@Param('id') id: string): Promise<void> {
    return this.service.softDelete(Number(id), 'demo');
  }

  // Reactivar profesional
  @Put(':id/reactivar')
  async reactivate(@Param('id') id: string): Promise<any> {
    const profesional = await this.service.reactivate(Number(id), 'demo');
    return this.agregarUltimoMovimiento(profesional);
  }

  // Debug: ver estructura de tabla
  @Get('debug/structure')
  debugStructure() {
    return this.service.debugStructure();
  }

  // ===== FUNCIÓN AUXILIAR =====
  private agregarUltimoMovimiento(profesional: Profesional): any {
    const obj: any = { ...profesional };
    
    let ultimoMovimiento = 'Sin información';
    
    if (profesional.fecha_baja && profesional.usuario_baja) {
      ultimoMovimiento = `${profesional.usuario_baja} - BAJA - ${this.formatearFechaArgentina(profesional.fecha_baja)}`;
    } 
    else if (profesional.fecha_modificacion && 
             profesional.fecha_alta && 
             new Date(profesional.fecha_modificacion).getTime() !== new Date(profesional.fecha_alta).getTime() && 
             profesional.usuario_modificacion) {
      ultimoMovimiento = `${profesional.usuario_modificacion} - MODIFICACIÓN - ${this.formatearFechaArgentina(profesional.fecha_modificacion)}`;
    } 
    else if (profesional.usuario_alta) {
      ultimoMovimiento = `${profesional.usuario_alta} - ALTA - ${this.formatearFechaArgentina(profesional.fecha_alta)}`;
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
