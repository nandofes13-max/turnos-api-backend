import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import { Turno } from './entities/turno.entity';
import { CreateTurnoDto } from './dto/create-turno.dto';
import { UpdateTurnoDto } from './dto/update-turno.dto';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { NegocioUsuarioRol } from '../negocios-usuarios-roles/entities/negocio-usuario-rol.entity';
import { Rol } from '../roles/entities/rol.entity';

@Injectable()
export class TurnosService {
  constructor(
    @InjectRepository(Turno)
    private readonly turnoRepository: Repository<Turno>,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(NegocioUsuarioRol)
    private readonly negocioUsuarioRolRepository: Repository<NegocioUsuarioRol>,
    @InjectRepository(Rol)
    private readonly rolRepository: Repository<Rol>,
  ) {}

  private async buscarOCrearUsuario(email: string, apellido: string, nombre: string, telefono: string): Promise<Usuario> {
    let usuario = await this.usuarioRepository.findOne({
      where: { email, fecha_baja: IsNull() },
    });

    if (usuario) {
      let actualizado = false;
      if (usuario.apellido !== apellido) {
        usuario.apellido = apellido;
        actualizado = true;
      }
      if (usuario.nombre !== nombre) {
        usuario.nombre = nombre;
        actualizado = true;
      }
      if (usuario.telefono !== telefono) {
        usuario.telefono = telefono;
        actualizado = true;
      }
      if (actualizado) {
        await this.usuarioRepository.save(usuario);
      }
      return usuario;
    }

    const nuevoUsuario = this.usuarioRepository.create({
      email,
      apellido,
      nombre,
      telefono,
      usuario_alta: 'sistema',
    });

    return await this.usuarioRepository.save(nuevoUsuario);
  }

  private async asignarRolPaciente(usuarioId: number, negocioId: number): Promise<void> {
    const rolPaciente = await this.rolRepository.findOne({
      where: { nombre: 'PACIENTE', fecha_baja: IsNull() },
    });

    if (!rolPaciente) {
      throw new BadRequestException('El rol PACIENTE no existe en el sistema');
    }

    const existeRelacion = await this.negocioUsuarioRolRepository.findOne({
      where: {
        usuarioId,
        negocioId,
        rolId: rolPaciente.id,
        fecha_baja: IsNull(),
      },
    });

    if (!existeRelacion) {
      const nuevaRelacion = this.negocioUsuarioRolRepository.create({
        usuarioId,
        negocioId,
        rolId: rolPaciente.id,
        usuario_alta: 'sistema',
      });
      await this.negocioUsuarioRolRepository.save(nuevaRelacion);
    }
  }

  async validarDisponibilidad(
    profesionalCentroId: number,
    inicio: Date,
    fin: Date,
    excludeId?: number,
  ): Promise<void> {
    const whereCondition: any = {
      profesionalCentroId,
      fecha_baja: IsNull(),
    };
    
    if (excludeId) {
      whereCondition.id = Not(excludeId);
    }
    
    const turnosExistentes = await this.turnoRepository.find({
      where: whereCondition,
    });

    for (const turno of turnosExistentes) {
      const haySolapamiento = (inicio < turno.fin && fin > turno.inicio);
      if (haySolapamiento) {
        throw new BadRequestException(
          `El horario seleccionado (${inicio.toISOString()} - ${fin.toISOString()}) ` +
          `está ocupado para este profesional.`
        );
      }
    }
  }

  async create(createTurnoDto: CreateTurnoDto): Promise<Turno> {
    const inicio = new Date(createTurnoDto.inicio);
    const fin = new Date(createTurnoDto.fin);

    if (fin <= inicio) {
      throw new BadRequestException('La fecha/hora de fin debe ser posterior a la de inicio');
    }

    const duracionCalculada = Math.round((fin.getTime() - inicio.getTime()) / 60000);
    if (duracionCalculada !== createTurnoDto.duracionMinutos) {
      throw new BadRequestException('La duración no coincide con el rango horario');
    }

    const usuario = await this.buscarOCrearUsuario(
      createTurnoDto.email,
      createTurnoDto.apellido,
      createTurnoDto.nombre,
      createTurnoDto.telefono,
    );

    await this.asignarRolPaciente(usuario.id, createTurnoDto.negocioId);
    await this.validarDisponibilidad(createTurnoDto.profesionalCentroId, inicio, fin);

    const turno = new Turno();
    turno.negocioId = createTurnoDto.negocioId;
    turno.centroId = createTurnoDto.centroId;
    turno.profesionalCentroId = createTurnoDto.profesionalCentroId;
    turno.especialidadId = createTurnoDto.especialidadId ?? null;
    turno.usuarioId = usuario.id;
    turno.inicio = inicio;
    turno.fin = fin;
    turno.duracionMinutos = createTurnoDto.duracionMinutos;
    turno.estado = createTurnoDto.estado || 'PENDIENTE';
    turno.precioReserva = createTurnoDto.precioReserva ?? null;
    turno.moneda = createTurnoDto.moneda || 'ARS';
    turno.canalOrigen = 'WEB';
    turno.observaciones = createTurnoDto.observaciones ?? null;
    turno.usuario_alta = usuario.email || 'sistema';

    const turnoGuardado = await this.turnoRepository.save(turno);
    console.log(`[TURNO CREADO] ID: ${turnoGuardado.id} - Usuario: ${usuario.email} - ${inicio.toISOString()}`);

    return turnoGuardado;
  }

  async update(id: number, updateTurnoDto: UpdateTurnoDto, usuarioModificador: string): Promise<Turno> {
    const turno = await this.turnoRepository.findOne({
      where: { id, fecha_baja: IsNull() },
    });

    if (!turno) {
      throw new NotFoundException(`Turno con ID ${id} no encontrado`);
    }

    if (updateTurnoDto.inicio && updateTurnoDto.fin) {
      const nuevoInicio = new Date(updateTurnoDto.inicio);
      const nuevoFin = new Date(updateTurnoDto.fin);
      
      if (nuevoFin <= nuevoInicio) {
        throw new BadRequestException('La fecha/hora de fin debe ser posterior a la de inicio');
      }
      
      await this.validarDisponibilidad(turno.profesionalCentroId, nuevoInicio, nuevoFin, id);
      
      turno.inicio = nuevoInicio;
      turno.fin = nuevoFin;
    }

    if (updateTurnoDto.duracionMinutos) turno.duracionMinutos = updateTurnoDto.duracionMinutos;
    if (updateTurnoDto.estado) turno.estado = updateTurnoDto.estado;
    if (updateTurnoDto.confirmado !== undefined) turno.confirmado = updateTurnoDto.confirmado;
    if (updateTurnoDto.motivoCancelacion) turno.motivoCancelacion = updateTurnoDto.motivoCancelacion;
    if (updateTurnoDto.observaciones) turno.observaciones = updateTurnoDto.observaciones;
    if (updateTurnoDto.precioReserva) turno.precioReserva = updateTurnoDto.precioReserva;
    if (updateTurnoDto.moneda) turno.moneda = updateTurnoDto.moneda;

    turno.usuario_modificacion = usuarioModificador;

    return await this.turnoRepository.save(turno);
  }

  async findByUsuario(usuarioId: number): Promise<Turno[]> {
    return this.turnoRepository.find({
      where: { usuarioId, fecha_baja: IsNull() },
      relations: ['negocio', 'centro', 'profesionalCentro', 'especialidad'],
      order: { inicio: 'DESC' },
    });
  }

  async findByProfesionalCentro(profesionalCentroId: number): Promise<Turno[]> {
    return this.turnoRepository.find({
      where: { profesionalCentroId, fecha_baja: IsNull() },
      relations: ['usuario', 'negocio', 'centro'],
      order: { inicio: 'ASC' },
    });
  }

  async cancelar(id: number, motivo: string, usuarioCancelador: string): Promise<Turno> {
    const turno = await this.turnoRepository.findOne({
      where: { id, fecha_baja: IsNull() },
    });

    if (!turno) {
      throw new NotFoundException(`Turno con ID ${id} no encontrado`);
    }

    if (turno.estado === 'CANCELADO') {
      throw new BadRequestException('El turno ya está cancelado');
    }

    turno.estado = 'CANCELADO';
    turno.canceladoAt = new Date();
    turno.canceladoPor = usuarioCancelador;
    turno.motivoCancelacion = motivo;
    turno.usuario_modificacion = usuarioCancelador;

    return await this.turnoRepository.save(turno);
  }

  async confirmar(id: number, usuarioConfirmador: string): Promise<Turno> {
    const turno = await this.turnoRepository.findOne({
      where: { id, fecha_baja: IsNull() },
    });

    if (!turno) {
      throw new NotFoundException(`Turno con ID ${id} no encontrado`);
    }

    if (turno.estado !== 'PENDIENTE') {
      throw new BadRequestException(`No se puede confirmar un turno en estado ${turno.estado}`);
    }

    turno.estado = 'CONFIRMADO';
    turno.confirmado = true;
    turno.confirmadoAt = new Date();
    turno.usuario_modificacion = usuarioConfirmador;

    return await this.turnoRepository.save(turno);
  }
}
