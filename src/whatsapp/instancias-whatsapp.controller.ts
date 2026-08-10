// src/whatsapp/instancias-whatsapp.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InstanciasWhatsappService } from './instancias-whatsapp.service';
import { CreateInstanciaWhatsappDto } from './dto/create-instancia-whatsapp.dto';
import { InstanciaWhatsapp } from './entities/instancia-whatsapp.entity';

@Controller('instancias-whatsapp')
export class InstanciasWhatsappController {
  constructor(private readonly service: InstanciasWhatsappService) {}

  /**
   * POST /instancias-whatsapp
   * Crea una nueva instancia de GREEN API
   * El administrador solo ingresa instanceId y apiToken
   */
  @Post()
  async create(
    @Body() createDto: CreateInstanciaWhatsappDto,
  ): Promise<InstanciaWhatsapp> {
    try {
      return await this.service.create(createDto, 'admin');
    } catch (error) {
      throw new BadRequestException(
        `Error al crear la instancia: ${error.message}`
      );
    }
  }

  /**
   * GET /instancias-whatsapp
   * Lista todas las instancias (activas e inactivas)
   */
  @Get()
  async findAll(): Promise<InstanciaWhatsapp[]> {
    return this.service.findAll();
  }

  /**
   * GET /instancias-whatsapp/activas
   * Lista solo las instancias activas (disponibles)
   */
  @Get('activas')
  async findActivas(): Promise<InstanciaWhatsapp[]> {
    return this.service.findActivas();
  }

  /**
   * GET /instancias-whatsapp/disponible
   * Busca una instancia disponible para asignar un nuevo negocio
   */
  @Get('disponible')
  async findDisponible(): Promise<InstanciaWhatsapp | null> {
    return this.service.findDisponible();
  }

  /**
   * GET /instancias-whatsapp/:id
   * Obtiene una instancia por ID
   */
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<InstanciaWhatsapp> {
    const idNum = Number(id);
    if (isNaN(idNum)) {
      throw new BadRequestException('ID inválido');
    }
    return this.service.findOne(idNum);
  }

  /**
   * PUT /instancias-whatsapp/:id
   * Actualiza una instancia (instanceId y apiToken)
   * Vuelve a validar credenciales y obtener el número de WhatsApp
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: CreateInstanciaWhatsappDto,
  ): Promise<InstanciaWhatsapp> {
    const idNum = Number(id);
    if (isNaN(idNum)) {
      throw new BadRequestException('ID inválido');
    }
    try {
      return await this.service.update(
        idNum,
        updateDto.instanceId,
        updateDto.apiToken,
        'admin'
      );
    } catch (error) {
      throw new BadRequestException(
        `Error al actualizar la instancia: ${error.message}`
      );
    }
  }

  /**
   * DELETE /instancias-whatsapp/:id
   * Da de baja lógica una instancia
   * Solo permite si no tiene negocios activos
   */
  @Delete(':id')
  async softDelete(@Param('id') id: string): Promise<{ message: string }> {
    const idNum = Number(id);
    if (isNaN(idNum)) {
      throw new BadRequestException('ID inválido');
    }
    try {
      await this.service.softDelete(idNum, 'admin');
      return { message: 'Instancia desactivada correctamente' };
    } catch (error) {
      throw new BadRequestException(
        `Error al desactivar la instancia: ${error.message}`
      );
    }
  }

  /**
   * POST /instancias-whatsapp/:id/reactivar
   * Reactiva una instancia previamente desactivada
   */
  @Post(':id/reactivar')
  async reactivar(@Param('id') id: string): Promise<InstanciaWhatsapp> {
    const idNum = Number(id);
    if (isNaN(idNum)) {
      throw new BadRequestException('ID inválido');
    }
    try {
      return await this.service.reactivar(idNum, 'admin');
    } catch (error) {
      throw new BadRequestException(
        `Error al reactivar la instancia: ${error.message}`
      );
    }
  }
}
