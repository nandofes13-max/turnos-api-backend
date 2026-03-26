import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param 
} from '@nestjs/common';
import { CentroService } from './centro.service';
import { Centro } from './entities/centro.entity';
import { CreateCentroDto } from './dto/create-centro.dto';
import { UpdateCentroDto } from './dto/update-centro.dto';

@Controller('centros')
export class CentroController {
  constructor(private readonly service: CentroService) {}

  // Listar todos los centros
  @Get()
  async findAll(): Promise<any[]> {
    const centros = await this.service.findAll();
    return centros.map(c => this.agregarUltimoMovimiento(c));
  }

  // Obtener un centro por ID
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<any> {
    const centro = await this.service.findOne(Number(id));
    return this.agregarUltimoMovimiento(centro);
  }

  // Obtener centros por negocio
  @Get('negocio/:negocioId')
  async findByNegocio(@Param('negocioId') negocioId: string): Promise<any[]> {
    const centros = await this.service.findByNegocio(Number(negocioId));
    return centros.map(c => this.agregarUltimoMovimiento(c));
  }

  // Crear nuevo centro
  @Post()
  async create(@Body() createDto: CreateCentroDto): Promise<any> {
    const centro = await this.service.create(createDto, 'demo');
    return this.agregarUltimoMovimiento(centro);
  }

  // Actualizar centro
  @Put(':id')
  async update(
    @Param('id') id: string, 
    @Body() updateDto: UpdateCentroDto
  ): Promise<any> {
    const centro = await this.service.update(Number(id), updateDto, 'demo');
    return this.agregarUltimoMovimiento(centro);
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
  private agregarUltimoMovimiento(centro: Centro): any {
    const obj: any = { ...centro };
    
    let ultimoMovimiento = 'Sin información';
    
    if (centro.fecha_baja && centro.usuario_baja) {
      ultimoMovimiento = `${centro.usuario_baja} - BAJA - ${this.formatearFechaArgentina(centro.fecha_baja)}`;
    } 
    else if (centro.fecha_modificacion && 
             centro.fecha_alta && 
             new Date(centro.fecha_modificacion).getTime() !== new Date(centro.fecha_alta).getTime() && 
             centro.usuario_modificacion) {
      ultimoMovimiento = `${centro.usuario_modificacion} - MODIFICACIÓN - ${this.formatearFechaArgentina(centro.fecha_modificacion)}`;
    } 
    else if (centro.usuario_alta) {
      ultimoMovimiento = `${centro.usuario_alta} - ALTA - ${this.formatearFechaArgentina(centro.fecha_alta)}`;
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
