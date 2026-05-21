import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not, In, ILike } from 'typeorm';
import { Turno } from './entities/turno.entity';
import { CreateTurnoDto } from './dto/create-turno.dto';
import { UpdateTurnoDto } from './dto/update-turno.dto';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { NegocioUsuarioRol } from '../negocios-usuarios-roles/entities/negocio-usuario-rol.entity';
import { Rol } from '../roles/entities/rol.entity';
import { NegocioEstadoTurno } from '../negocios-estados-turno/entities/negocio-estado-turno.entity';
import { NegocioActividad } from '../negocio-actividades/entities/negocio-actividad.entity';
import { Centro } from '../centro/entities/centro.entity';

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
    @InjectRepository(NegocioEstadoTurno)
    private readonly estadoTurnoRepository: Repository<NegocioEstadoTurno>,
    @InjectRepository(NegocioActividad)
    private readonly negocioActividadRepository: Repository<NegocioActividad>,
    @InjectRepository(Centro)
    private readonly centroRepository: Repository<Centro>,
  ) {}

  async findAll(filtros: {
    usuarioId?: number;
    negocioId?: number;
    actividadId?: number;
    desde?: string;
    hasta?: string;
    profesionalId?: number;
    especialidadId?: number;
    centroId?: number;
    canalOrigen?: string;
    asistio?: boolean;
    estadoTurnoId?: number;
    estadoPago?: string;
    pacienteSearch?: string;
  }): Promise<any[]> {
    const queryBuilder = this.turnoRepository.createQueryBuilder('t')
      .leftJoinAndSelect('t.usuario', 'usuario')
      .leftJoinAndSelect('t.profesionalCentro', 'pc')
      .leftJoinAndSelect('pc.profesional', 'profesional')
      .leftJoinAndSelect('pc.especialidad', 'especialidad')
      .leftJoinAndSelect('pc.centro', 'centro')
      .leftJoinAndSelect('centro.negocio', 'negocio')
      .leftJoinAndSelect('t.estadoTurno', 'estadoTurno');

    if (filtros.usuarioId) {
      const negociosPermitidos = await this.negocioUsuarioRolRepository.find({
        where: { usuarioId: filtros.usuarioId, fecha_baja: IsNull() },
        select: ['negocioId'],
      });
      const ids = negociosPermitidos.map(n => n.negocioId);
      if (ids.length === 0) {
        return [];
      }
      queryBuilder.andWhere('negocio.id IN (:...ids)', { ids });
    }

    if (filtros.negocioId) {
      queryBuilder.andWhere('negocio.id = :negocioId', { negocioId: filtros.negocioId });
    }

    if (filtros.actividadId) {
      const especialidadesDeActividad = await this.turnoRepository.query(
        `SELECT ae.especialidad_id 
         FROM actividad_especialidad ae
         WHERE ae.actividad_id = $1 AND ae.fecha_baja IS NULL`,
        [filtros.actividadId]
      );
      
      const especialidadIds = especialidadesDeActividad.map((e: any) => e.especialidad_id);
      
      if (especialidadIds.length === 0) {
        return [];
      }
      
      queryBuilder.andWhere('t.especialidadId IN (:...especialidadIds)', { especialidadIds });
    }

    if (filtros.desde) {
      queryBuilder.andWhere('t.fechaTurno >= :desde', { desde: filtros.desde });
    }
    if (filtros.hasta) {
      queryBuilder.andWhere('t.fechaTurno <= :hasta', { hasta: filtros.hasta });
    }

    if (filtros.profesionalId) {
      queryBuilder.andWhere('profesional.id = :profesionalId', { profesionalId: filtros.profesionalId });
    }

    if (filtros.especialidadId) {
      queryBuilder.andWhere('especialidad.id = :especialidadId', { especialidadId: filtros.especialidadId });
    }

    if (filtros.centroId) {
      queryBuilder.andWhere('centro.id = :centroId', { centroId: filtros.centroId });
    }

    if (filtros.canalOrigen) {
      queryBuilder.andWhere('t.canal_origen = :canalOrigen', { canalOrigen: filtros.canalOrigen });
    }

    if (filtros.asistio !== undefined) {
      queryBuilder.andWhere('t.asistio = :asistio', { asistio: filtros.asistio });
    }

    if (filtros.estadoTurnoId) {
      queryBuilder.andWhere('t.estado_turno_id = :estadoTurnoId', { estadoTurnoId: filtros.estadoTurnoId });
    }

    if (filtros.pacienteSearch && filtros.pacienteSearch.trim()) {
      const searchTerm = `%${filtros.pacienteSearch.trim()}%`;
      queryBuilder.andWhere(
        '(usuario.nombre ILIKE :search OR usuario.apellido ILIKE :search OR usuario.email ILIKE :search OR CAST(usuario.documento AS TEXT) ILIKE :search)',
        { search: searchTerm }
      );
    }

    queryBuilder.orderBy('t.fechaTurno', 'DESC').addOrderBy('t.horaInicio', 'DESC');

    const turnos = await queryBuilder.getMany();
    
    const turnosConMovimiento = turnos.map(turno => {
      let ultimoMovimiento = 'Sin información';
      let fechaMovimiento: Date | null = null;
      let usuarioMovimiento: string | null = null;
      let tipoMovimiento: string | null = null;
      
      const timezone = turno.timezone || turno.profesionalCentro?.centro?.timezone || 'America/Argentina/Buenos_Aires';
      
      if (turno.fecha_baja && turno.usuario_baja) {
        fechaMovimiento = turno.fecha_baja;
        usuarioMovimiento = turno.usuario_baja;
        tipoMovimiento = 'BAJA';
      }
      else if (turno.fecha_modificacion && 
               turno.usuario_modificacion &&
               (!turno.fecha_alta || turno.fecha_modificacion.getTime() !== turno.fecha_alta.getTime())) {
        fechaMovimiento = turno.fecha_modificacion;
        usuarioMovimiento = turno.usuario_modificacion;
        tipoMovimiento = 'MODIFICACIÓN';
      }
      else if (turno.usuario_alta) {
        fechaMovimiento = turno.fecha_alta;
        usuarioMovimiento = turno.usuario_alta;
        tipoMovimiento = 'ALTA';
      }
      
      if (fechaMovimiento && usuarioMovimiento && tipoMovimiento) {
        const fechaFormateada = this.formatearFechaEnTimezone(fechaMovimiento, timezone);
        ultimoMovimiento = `${usuarioMovimiento} - ${tipoMovimiento} - ${fechaFormateada}`;
      }
      
      return {
        ...turno,
        ultimoMovimiento
      };
    });
    
    return turnosConMovimiento;
  }

  private formatearFechaEnTimezone(fecha: Date, timezone: string): string {
    return new Date(fecha).toLocaleString('es-AR', {
      timeZone: timezone,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).replace(',', '');
  }

  private async obtenerEstadoReservadoId(negocioId: number): Promise<number> {
    return 1;
  }

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
    fechaTurno: Date,
    horaInicio: string,
    horaFin: string,
    excludeId?: number,
  ): Promise<void> {
    const whereCondition: any = {
      profesionalCentroId,
      fecha_baja: IsNull(),
      fechaTurno: fechaTurno,
      horaInicio: horaInicio,
    };
    
    if (excludeId) {
      whereCondition.id = Not(excludeId);
    }
    
    const turnosExistentes = await this.turnoRepository.find({
      where: whereCondition,
    });

    if (turnosExistentes.length > 0) {
      throw new BadRequestException(
        `El horario seleccionado (${fechaTurno.toISOString().split('T')[0]} ${horaInicio}) ya está ocupado para este profesional.`
      );
    }
  }

  async create(createTurnoDto: CreateTurnoDto): Promise<Turno> {
    if (createTurnoDto.horaFin <= createTurnoDto.horaInicio) {
      throw new BadRequestException('La hora de fin debe ser posterior a la hora de inicio');
    }

    // ✅ Obtener el centro para guardar su timezone
    const centro = await this.centroRepository.findOne({
      where: { id: createTurnoDto.centroId },
    });

    if (!centro) {
      throw new BadRequestException('El centro seleccionado no existe');
    }

    const usuario = await this.buscarOCrearUsuario(
      createTurnoDto.email,
      createTurnoDto.apellido,
      createTurnoDto.nombre,
      createTurnoDto.telefono,
    );

    await this.asignarRolPaciente(usuario.id, createTurnoDto.negocioId);
    await this.validarDisponibilidad(
      createTurnoDto.profesionalCentroId,
      createTurnoDto.fechaTurno,
      createTurnoDto.horaInicio,
      createTurnoDto.horaFin,
    );

    const estadoReservadoId = await this.obtenerEstadoReservadoId(createTurnoDto.negocioId);

    const turno = new Turno();
    turno.negocioId = createTurnoDto.negocioId;
    turno.centroId = createTurnoDto.centroId;
    turno.profesionalCentroId = createTurnoDto.profesionalCentroId;
    turno.especialidadId = createTurnoDto.especialidadId ?? null;
    turno.usuarioId = usuario.id;
    turno.fechaTurno = createTurnoDto.fechaTurno;
    turno.horaInicio = createTurnoDto.horaInicio;
    turno.horaFin = createTurnoDto.horaFin;
    turno.duracionMinutos = createTurnoDto.duracionMinutos;
    turno.estadoTurnoId = estadoReservadoId;
    turno.precioReserva = createTurnoDto.precioReserva ?? null;
    turno.moneda = createTurnoDto.moneda || 'ARS';
    turno.canalOrigen = 'WEB';
    turno.observaciones = createTurnoDto.observaciones ?? null;
    turno.usuario_alta = usuario.email || 'sistema';
    
    // ✅ Guardar la zona horaria del centro en el turno
    turno.timezone = centro.timezone || 'America/Argentina/Buenos_Aires';

    const turnoGuardado = await this.turnoRepository.save(turno);
    console.log(`[TURNO CREADO] ID: ${turnoGuardado.id} - Usuario: ${usuario.email} - ${turnoGuardado.fechaTurno} ${turnoGuardado.horaInicio} - Timezone: ${turnoGuardado.timezone}`);

    return turnoGuardado;
  }

  async update(id: number, updateTurnoDto: UpdateTurnoDto, usuarioModificador: string): Promise<Turno> {
    const turno = await this.turnoRepository.findOne({
      where: { id },
      relations: ['estadoTurno'],
    });

    if (!turno) {
      throw new NotFoundException(`Turno con ID ${id} no encontrado`);
    }

    if (updateTurnoDto.asistio !== undefined && turno.estadoTurno?.nombre === 'CANCELADO') {
      throw new BadRequestException('No se puede cambiar la asistencia de un turno cancelado');
    }

    if (updateTurnoDto.fechaTurno) {
      turno.fechaTurno = updateTurnoDto.fechaTurno;
    }
    if (updateTurnoDto.horaInicio) {
      turno.horaInicio = updateTurnoDto.horaInicio;
    }
    if (updateTurnoDto.horaFin) {
      if (updateTurnoDto.horaFin <= turno.horaInicio) {
        throw new BadRequestException('La hora de fin debe ser posterior a la hora de inicio');
      }
      turno.horaFin = updateTurnoDto.horaFin;
    }

    if (updateTurnoDto.duracionMinutos) turno.duracionMinutos = updateTurnoDto.duracionMinutos;
    if (updateTurnoDto.observaciones) turno.observaciones = updateTurnoDto.observaciones;
    if (updateTurnoDto.precioReserva) turno.precioReserva = updateTurnoDto.precioReserva;
    if (updateTurnoDto.moneda) turno.moneda = updateTurnoDto.moneda;

    if (updateTurnoDto.asistio !== undefined) {
      turno.asistio = updateTurnoDto.asistio;
      
      if (turno.asistio === true) {
        turno.llegadaAt = new Date();
      } else {
        turno.llegadaAt = null;
      }
    }

    if (updateTurnoDto.estadoTurnoId) {
      const estadoExistente = await this.estadoTurnoRepository.findOne({
        where: { id: updateTurnoDto.estadoTurnoId, fecha_baja: IsNull() },
      });
      if (!estadoExistente) {
        throw new BadRequestException(`El estado con ID ${updateTurnoDto.estadoTurnoId} no existe o está inactivo`);
      }
      
      const estadoAnterior = turno.estadoTurno?.nombre;
      turno.estadoTurnoId = updateTurnoDto.estadoTurnoId;
      turno.estadoTurno = estadoExistente;
      
      if (estadoAnterior === 'CANCELADO' && estadoExistente.id === 1) {
        turno.fecha_baja = null as any;
      }
      
      if (estadoExistente.nombre === 'CANCELADO') {
        turno.fecha_baja = new Date();
      }
    }

    turno.usuario_modificacion = usuarioModificador;

    return await this.turnoRepository.save(turno);
  }

  async findByUsuario(usuarioId: number): Promise<Turno[]> {
    return this.turnoRepository.find({
      where: { usuarioId },
      relations: ['negocio', 'centro', 'profesionalCentro', 'especialidad', 'estadoTurno'],
      order: { fechaTurno: 'DESC', horaInicio: 'DESC' },
    });
  }

  async findByProfesionalCentro(profesionalCentroId: number): Promise<Turno[]> {
    return this.turnoRepository.find({
      where: { profesionalCentroId },
      relations: ['usuario', 'negocio', 'centro', 'estadoTurno'],
      order: { fechaTurno: 'ASC', horaInicio: 'ASC' },
    });
  }

  async cancelar(id: number, motivo: string, usuarioCancelador: string): Promise<Turno> {
    const turno = await this.turnoRepository.findOne({
      where: { id },
      relations: ['estadoTurno'],
    });

    if (!turno) {
      throw new NotFoundException(`Turno con ID ${id} no encontrado`);
    }

    if (turno.estadoTurno?.nombre === 'CANCELADO') {
      throw new BadRequestException('El turno ya está cancelado');
    }

    const estadoCancelado = await this.estadoTurnoRepository.findOne({
      where: { negocioId: turno.negocioId, nombre: 'CANCELADO', fecha_baja: IsNull() },
    });
    if (!estadoCancelado) {
      throw new BadRequestException('No se encontró el estado CANCELADO para este negocio');
    }

    turno.estadoTurnoId = estadoCancelado.id;
    turno.estadoTurno = estadoCancelado;
    turno.fecha_baja = new Date();
    turno.usuario_modificacion = usuarioCancelador;

    return await this.turnoRepository.save(turno);
  }

  async findProfesionalesPorCentroEspecialidad(
    centroId: number,
    especialidadId: number,
  ): Promise<any[]> {
    try {
      console.log(`[TurnosService] Buscando profesionales para centroId: ${centroId}, especialidadId: ${especialidadId}`);
      
      const sql = `
        SELECT DISTINCT 
          p.id,
          p.nombre,
          p.documento,
          p.foto,
          p.email,
          p.matricula
        FROM profesional_centro pc
        INNER JOIN profesional p ON p.id = pc.profesional_id AND p.fecha_baja IS NULL
        WHERE pc.centro_id = $1
          AND pc.especialidad_id = $2
          AND pc.fecha_baja IS NULL
        ORDER BY p.nombre ASC
      `;
      
      const results = await this.turnoRepository.query(sql, [centroId, especialidadId]);
      
      console.log(`[TurnosService] Profesionales encontrados: ${results.length}`);
      return results;
    } catch (error) {
      console.error('[TurnosService] Error en consulta de profesionales:', error);
      throw new BadRequestException(`Error al obtener profesionales: ${error.message}`);
    }
  }
}
