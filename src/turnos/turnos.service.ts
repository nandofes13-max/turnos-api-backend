import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Between } from 'typeorm';
import { Turno } from './entities/turno.entity';
import { CreateTurnoDto } from './dto/create-turno.dto';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { NegociosUsuariosRoles } from '../negocios-usuarios-roles/entities/negocios-usuarios-rol.entity';
import { Rol } from '../roles/entities/rol.entity';

@Injectable()
export class TurnosService {
  constructor(
    @InjectRepository(Turno)
    private readonly turnoRepository: Repository<Turno>,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(NegociosUsuariosRoles)
    private readonly negocioUsuarioRolRepository: Repository<NegociosUsuariosRoles>,
    @InjectRepository(Rol)
    private readonly rolRepository: Repository<Rol>,
  ) {}

  // ============================================================
  // BUSCAR O CREAR USUARIO
  // ============================================================
  private async buscarOCrearUsuario(email: string, apellido: string, nombre: string, telefono: string): Promise<Usuario> {
    // Buscar usuario existente por email
    let usuario = await this.usuarioRepository.findOne({
      where: { email, fecha_baja: IsNull() },
    });

    if (usuario) {
      // Si existe, actualizar datos si es necesario
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

    // Crear nuevo usuario
    const nuevoUsuario = this.usuarioRepository.create({
      email,
      apellido,
      nombre,
      telefono,
      usuario_alta: 'sistema',
    });

    return await this.usuarioRepository.save(nuevoUsuario);
  }

  // ============================================================
  // ASIGNAR ROL PACIENTE AL USUARIO EN EL NEGOCIO
  // ============================================================
  private async asignarRolPaciente(usuarioId: number, negocioId: number): Promise<void> {
    // Buscar rol PACIENTE
    const rolPaciente = await this.rolRepository.findOne({
      where: { nombre: 'PACIENTE', fecha_baja: IsNull() },
    });

    if (!rolPaciente) {
      throw new BadRequestException('El rol PACIENTE no existe en el sistema');
    }

    // Verificar si ya existe la relación
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

  // ============================================================
  // VALIDAR DISPONIBILIDAD (sin solapamiento)
  // ============================================================
  private async validarDisponibilidad(
    profesionalCentroId: number,
    inicio: Date,
    fin: Date,
  ): Promise<void> {
    const turnoExistente = await this.turnoRepository.findOne({
      where: {
        profesionalCentroId,
        fecha_baja: IsNull(),
      },
    });

    if (turnoExistente) {
      // Verificar si hay solapamiento
      const haySolapamiento = (
        (inicio < turnoExistente.fin && fin > turnoExistente.inicio)
      );

      if (haySolapamiento) {
        throw new BadRequestException(
          `El horario seleccionado (${inicio.toISOString()} - ${fin.toISOString()}) ` +
          `está ocupado para este profesional.`
        );
      }
    }
  }

  // ============================================================
  // CREAR TURNO (RESERVA)
  // ============================================================
  async create(createTurnoDto: CreateTurnoDto): Promise<Turno> {
    // 1. Validar que fin > inicio
    const inicio = new Date(createTurnoDto.inicio);
    const fin = new Date(createTurnoDto.fin);

    if (fin <= inicio) {
      throw new BadRequestException('La fecha/hora de fin debe ser posterior a la de inicio');
    }

    // 2. Validar duración
    const duracionCalculada = Math.round((fin.getTime() - inicio.getTime()) / 60000);
    if (duracionCalculada !== createTurnoDto.duracionMinutos) {
      throw new BadRequestException('La duración no coincide con el rango horario');
    }

    // 3. Buscar o crear usuario
    const usuario = await this.buscarOCrearUsuario(
      createTurnoDto.email,
      createTurnoDto.apellido,
      createTurnoDto.nombre,
      createTurnoDto.telefono,
    );

    // 4. Asignar rol PACIENTE en el negocio
    await this.asignarRolPaciente(usuario.id, createTurnoDto.negocioId);

    // 5. Validar disponibilidad (sin solapamiento)
    await this.validarDisponibilidad(
      createTurnoDto.profesionalCentroId,
      inicio,
      fin,
    );

    // 6. Crear el turno
    const turno = this.turnoRepository.create({
      negocioId: createTurnoDto.negocioId,
      centroId: createTurnoDto.centroId,
      profesionalCentroId: createTurnoDto.profesionalCentroId,
      especialidadId: createTurnoDto.especialidadId || null,
      usuarioId: usuario.id,
      inicio,
      fin,
      duracionMinutos: createTurnoDto.duracionMinutos,
      estado: createTurnoDto.estado || 'PENDIENTE',
      precioReserva: createTurnoDto.precioReserva || null,
      moneda: createTurnoDto.moneda || 'ARS',
      canalOrigen: 'WEB',
      usuario_alta: usuario.email || 'sistema',
    });

    const turnoGuardado = await this.turnoRepository.save(turno);

    // 7. TODO: Enviar notificaciones (email + WhatsApp)
    // Por ahora solo log
    console.log(`[TURNO CREADO] ID: ${turnoGuardado.id} - Usuario: ${usuario.email} - ${inicio.toISOString()}`);

    return turnoGuardado;
  }

  // ============================================================
  // OBTENER TURNOS POR USUARIO
  // ============================================================
  async findByUsuario(usuarioId: number): Promise<Turno[]> {
    return this.turnoRepository.find({
      where: { usuarioId, fecha_baja: IsNull() },
      relations: ['negocio', 'centro', 'profesionalCentro', 'especialidad'],
      order: { inicio: 'DESC' },
    });
  }

  // ============================================================
  // OBTENER TURNOS POR PROFESIONAL
  // ============================================================
  async findByProfesionalCentro(profesionalCentroId: number): Promise<Turno[]> {
    return this.turnoRepository.find({
      where: { profesionalCentroId, fecha_baja: IsNull() },
      relations: ['usuario', 'negocio', 'centro'],
      order: { inicio: 'ASC' },
    });
  }

  // ============================================================
  // CANCELAR TURNO
  // ============================================================
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

  // ============================================================
  // CONFIRMAR TURNO
  // ============================================================
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
