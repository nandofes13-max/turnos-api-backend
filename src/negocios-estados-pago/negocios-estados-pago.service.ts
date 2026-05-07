import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import { NegocioEstadoPago } from './entities/negocio-estado-pago.entity';
import { CreateNegocioEstadoPagoDto } from './dto/create-negocio-estado-pago.dto';
import { UpdateNegocioEstadoPagoDto } from './dto/update-negocio-estado-pago.dto';

@Injectable()
export class NegociosEstadosPagoService {
  constructor(
    @InjectRepository(NegocioEstadoPago)
    private readonly repository: Repository<NegocioEstadoPago>,
  ) {}

  async findAll(negocioId?: number, soloActivos: boolean = true): Promise<NegocioEstadoPago[]> {
    const where: any = {};
    
    if (negocioId) {
      where.negocioId = negocioId;
    }
    
    if (soloActivos) {
      where.fecha_baja = IsNull();
    }
    
    return this.repository.find({
      where,
      relations: ['negocio'],
      order: { orden: 'ASC', id: 'ASC' },
    });
  }

  async findOne(id: number): Promise<NegocioEstadoPago> {
    const registro = await this.repository.findOne({
      where: { id },
      relations: ['negocio'],
    });

    if (!registro) {
      throw new NotFoundException(`Estado de pago con id ${id} no encontrado`);
    }

    return registro;
  }

  async findByNegocio(negocioId: number, soloActivos: boolean = true): Promise<NegocioEstadoPago[]> {
    const where: any = { negocioId };
    
    if (soloActivos) {
      where.fecha_baja = IsNull();
    }
    
    return this.repository.find({
      where,
      relations: ['negocio'],
      order: { orden: 'ASC', id: 'ASC' },
    });
  }

  async create(createDto: CreateNegocioEstadoPagoDto, usuario?: string): Promise<NegocioEstadoPago> {
    // Verificar que no exista un estado con el mismo nombre para el mismo negocio
    const existente = await this.repository.findOne({
      where: {
        negocioId: createDto.negocioId,
        nombre: createDto.nombre,
        fecha_baja: IsNull(),
      },
    });

    if (existente) {
      throw new BadRequestException(`Ya existe un estado de pago con el nombre "${createDto.nombre}" para este negocio`);
    }

    const registro = this.repository.create({
      ...createDto,
      usuario_alta: usuario || 'sistema',
    });

    return await this.repository.save(registro);
  }

  async update(id: number, updateDto: UpdateNegocioEstadoPagoDto, usuario?: string): Promise<NegocioEstadoPago> {
    const registro = await this.findOne(id);

    // Si está cambiando el nombre, verificar duplicado (excluyendo este registro)
    if (updateDto.nombre && updateDto.nombre !== registro.nombre) {
      const existente = await this.repository.findOne({
        where: {
          negocioId: updateDto.negocioId ?? registro.negocioId,
          nombre: updateDto.nombre,
          fecha_baja: IsNull(),
          id: Not(id),
        },
      });

      if (existente) {
        throw new BadRequestException(`Ya existe un estado de pago con el nombre "${updateDto.nombre}" para este negocio`);
      }
    }

    Object.assign(registro, updateDto);
    registro.usuario_modificacion = usuario || 'sistema';
    registro.fecha_modificacion = new Date();

    return await this.repository.save(registro);
  }

  async softDelete(id: number, usuario?: string): Promise<void> {
    const registro = await this.findOne(id);
    
    if (registro.fecha_baja) {
      throw new BadRequestException('El estado de pago ya está inactivo');
    }

    registro.fecha_baja = new Date();
    registro.usuario_baja = usuario || 'sistema';

    await this.repository.save(registro);
  }

  async getEstadosPagoActivos(negocioId: number): Promise<NegocioEstadoPago[]> {
    return this.repository.find({
      where: {
        negocioId,
        fecha_baja: IsNull(),
      },
      order: { orden: 'ASC' },
    });
  }
}
