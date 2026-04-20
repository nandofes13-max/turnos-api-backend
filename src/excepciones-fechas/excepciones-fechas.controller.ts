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
  async findAll(): Promise<ExcepcionFecha[]> {
    return this.service.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ExcepcionFecha> {
    return this.service.findOne(Number(id));
  }

  @Get('por-profesional-centro/:profesionalCentroId')
  async findByProfesionalCentro(@Param('profesionalCentroId') profesionalCentroId: string): Promise<ExcepcionFecha[]> {
    return this.service.findByProfesionalCentro(Number(profesionalCentroId));
  }

  @Post()
  async create(@Body() createDto: CreateExcepcionFechaDto): Promise<ExcepcionFecha> {
    return this.service.create(createDto, 'demo');
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDto: UpdateExcepcionFechaDto): Promise<ExcepcionFecha> {
    return this.service.update(Number(id), updateDto, 'demo');
  }

  @Delete(':id')
  softDelete(@Param('id') id: string): Promise<void> {
    return this.service.softDelete(Number(id), 'demo');
  }

  @Post('habilitar')
  async habilitar(@Body() body: {
    profesionalCentroId: number;
    fechaDesde: string;
    fechaHasta?: string | null;
    horaDesde?: string | null;
    horaHasta?: string | null;
  }) {
    await this.service.habilitar(
      body.profesionalCentroId,
      body.fechaDesde,
      body.fechaHasta || null,
      body.horaDesde || null,
      body.horaHasta || null,
      'demo'
    );
    return { message: 'Excepción habilitada correctamente' };
  }
}
