import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import { NegocioEstadoTurno } from './entities/negocio-estado-turno.entity';
import { CreateNegocioEstadoTurnoDto } from './dto/create-negocio-estado-turno.dto';
import { UpdateNegocioEstadoTurnoDto } from './dto/update-negocio-estado-turno.dto';

@Injectable()
export class NegociosEstadosTurnoService {
  constructor(
    @InjectRepository(NegocioEstadoTurno)
    private readonly repository: Repository<NegocioEstadoTurno>,
  ) {}

  async findAll(negocioId?: number, soloActivos: boolean = true): Promise<NegocioEstadoTurno[]> {
    const where: any = {};
    
    if (negocioId) {
      where.negocioId = negocioId;
    }
    
    if (soloActivos) {
      where.fecha_baja = IsNull();
    }
    
    return this.repository.find({
      where,
      relations: ['negocio', 'centro', 'especialidad'],
      order: { orden: 'ASC', id: 'ASC' },
    });
  }

  async findOne(id: number): Promise<NegocioEstadoTurno> {
    const registro = await this.repository.findOne({
      where: { id },
      relations: ['negocio', 'centro', 'especialidad'],
    });

    if (!registro) {
      throw new NotFoundException(`Estado turno con id ${id} no encontrado`);
    }

    return registro;
  }

  async findByNegocio(negocioId: number, soloActivos: boolean = true): Promise<NegocioEstadoTurno[]> {
    const where: any = { negocioId };
    
    if (soloActivos) {
      where.fecha_baja = IsNull();
    }
    
    return this.repository.find({
      where,
      relations: ['negocio', 'centro', 'especialidad'],
      order: { orden: 'ASC', id: 'ASC' },
    });
  }

  async create(createDto: CreateNegocioEstadoTurnoDto, usuario?: string): Promise<NegocioEstadoTurno> {
    // Verificar que no exista un estado con el mismo nombre para el mismo nivel
    const existente = await this.repository.findOne({
      where: {
        negocioId: createDto.negocioId,
        centroId: createDto.centroId || null,
        especialidadId: createDto.especialidadId || null,
        nombre: createDto.nombre,
        fecha_baja: IsNull(),
      },
    });

    if (existente) {
      throw new BadRequestException(`Ya existe un estado con el nombre "${createDto.nombre}" para este nivel`);
    }

    const registro = this.repository.create({
      ...createDto,
      usuario_alta: usuario || 'sistema',
    });

    return await this.repository.save(registro);
  }

  async update(id: number, updateDto: UpdateNegocioEstadoTurnoDto, usuario?: string): Promise<NegocioEstadoTurno> {
    const registro = await this.findOne(id);

    // Si está cambiando el nombre, verificar duplicado (excluyendo este registro)
    if (updateDto.nombre && updateDto.nombre !== registro.nombre) {
      const existente = await this.repository.findOne({
        where: {
          negocioId: updateDto.negocioId ?? registro.negocioId,
          centroId: updateDto.centroId ?? registro.centroId,
          especialidadId: updateDto.especialidadId ?? registro.especialidadId,
          nombre: updateDto.nombre,
          fecha_baja: IsNull(),
          id: Not(id),
        },
      });

      if (existente) {
        throw new BadRequestException(`Ya existe un estado con el nombre "${updateDto.nombre}" para este nivel`);
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
      throw new BadRequestException('El estado ya está inactivo');
    }

    // Verificar que no haya turnos usando este estado (opcional)
    // const turnosUsando = await this.turnoRepository.count({ where: { estadoTurnoId: id } });
    // if (turnosUsando > 0) {
    //   throw new BadRequestException('No se puede desactivar un estado que está siendo usado por turnos');
    // }

    registro.fecha_baja = new Date();
    registro.usuario_baja = usuario || 'sistema';

    await this.repository.save(registro);
  }

  async getEstadosDisponiblesParaSlot(negocioId: number): Promise<NegocioEstadoTurno[]> {
    return this.repository.find({
      where: {
        negocioId,
        disponibleSlot: true,
        fecha_baja: IsNull(),
      },
      order: { orden: 'ASC' },
    });
  }

  async getEstadosConfiguracion(negocioId: number): Promise<NegocioEstadoTurno[]> {
    return this.repository.find({
      where: {
        negocioId,
        fecha_baja: IsNull(),
      },
      relations: ['centro', 'especialidad'],
      order: { orden: 'ASC' },
    });
  }
}
