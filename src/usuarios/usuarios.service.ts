// src/usuarios/usuarios.service.ts
import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Usuario } from './entities/usuario.entity';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { DOMINIOS_VALIDOS } from './constants/dominios-email';
import { NegocioUsuarioRol } from '../negocios-usuarios-roles/entities/negocio-usuario-rol.entity';
import { Rol } from '../roles/entities/rol.entity';
import * as dns from 'dns';
import { promisify } from 'util';

const resolveMx = promisify(dns.resolveMx);

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(NegocioUsuarioRol)
    private readonly negocioUsuarioRolRepository: Repository<NegocioUsuarioRol>,
    @InjectRepository(Rol)
    private readonly rolRepository: Repository<Rol>,
  ) {}

  // ===== VALIDACIÓN MX =====
  private async validarMX(email: string): Promise<boolean> {
    const dominio = email.split('@')[1];
    
    try {
      const mxRecords = await resolveMx(dominio);
      return mxRecords && mxRecords.length > 0;
    } catch (error) {
      return false;
    }
  }

  // ===== VALIDACIÓN DE DOMINIO CONOCIDO =====
  private validarDominioConocido(email: string): { valido: boolean; sugerencia?: string } {
    const dominio = email.split('@')[1];
    
    if (DOMINIOS_VALIDOS.includes(dominio)) {
      return { valido: true };
    }
    
    if (dominio.startsWith('gmail.')) {
      return { 
        valido: false, 
        sugerencia: '¿Quisiste decir gmail.com?' 
      };
    }
    
    if (dominio === 'gnail.com' || dominio === 'gmai.com' || dominio === 'gmal.com') {
      return { 
        valido: false, 
        sugerencia: '¿Quisiste decir gmail.com?' 
      };
    }
    
    if (dominio.includes('hotmail') && dominio !== 'hotmail.com' && !dominio.endsWith('.com')) {
      return { 
        valido: false, 
        sugerencia: 'Los dominios de Hotmail suelen ser hotmail.com, hotmail.com.ar, etc.' 
      };
    }
    
    if (dominio === 'yahooo.com' || dominio === 'yahoo.com.ar' || dominio === 'yahoo.com') {
      return { valido: true };
    }
    if (dominio.startsWith('yahoo.') && dominio !== 'yahoo.com') {
      return { 
        valido: false, 
        sugerencia: '¿Quisiste decir yahoo.com?' 
      };
    }
    
    if (dominio === 'outlook.com' || dominio === 'outlook.com.ar' || dominio === 'outlook.com.mx') {
      return { valido: true };
    }
    if (dominio.startsWith('outlook.') && !dominio.endsWith('.com')) {
      return { 
        valido: false, 
        sugerencia: '¿Quisiste decir outlook.com?' 
      };
    }
    
    return { 
      valido: true, 
      sugerencia: 'El dominio es válido pero poco común. Verificá que sea correcto.' 
    };
  }

  // ===== ASIGNAR ROL PACIENTE (negocio DEMO) =====
  private async asignarRolPaciente(usuarioId: number): Promise<void> {
    const negocioId = 6; // Negocio DEMO
    
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

  // Obtener todos los usuarios
  async findAll(): Promise<Usuario[]> {
    return this.usuariosRepository.find();
  }

  // Obtener un usuario por ID
  async findOne(id: number): Promise<Usuario> {
    const usuario = await this.usuariosRepository.findOneBy({ id });

    if (!usuario) {
      throw new NotFoundException(`Usuario con id ${id} no encontrado`);
    }

    return usuario;
  }

  // Obtener un usuario por email
  async findByEmail(email: string): Promise<Usuario | null> {
    return this.usuariosRepository.findOneBy({ email: email.toLowerCase() });
  }

  // ✅ NUEVO: Crear o actualizar usuario (upsert) con asignación de rol PACIENTE
  async upsert(createUsuarioDto: CreateUsuarioDto, usuario?: string): Promise<Usuario> {
    // Validar MX records del dominio
    const mxValido = await this.validarMX(createUsuarioDto.email);
    if (!mxValido) {
      throw new BadRequestException('El dominio del email no existe o no puede recibir correos');
    }

    // Validar dominio conocido
    const dominioValido = this.validarDominioConocido(createUsuarioDto.email);
    if (!dominioValido.valido) {
      throw new BadRequestException(dominioValido.sugerencia || 'El dominio del email no es válido');
    }

    // Convertir email a minúsculas
    const emailLower = createUsuarioDto.email.toLowerCase();

    // Buscar si ya existe un usuario con ese email (activo o inactivo)
    let usuarioExistente = await this.usuariosRepository.findOneBy({ 
      email: emailLower,
    });

    if (usuarioExistente) {
      // Si existe, actualizar datos
      usuarioExistente.apellido = createUsuarioDto.apellido.toUpperCase();
      usuarioExistente.nombre = createUsuarioDto.nombre.toUpperCase();
      usuarioExistente.telefono = createUsuarioDto.telefono ?? '';
      // Si estaba dado de baja, reactivar
      if (usuarioExistente.fecha_baja) {
        usuarioExistente.fecha_baja = null as any;
        usuarioExistente.usuario_baja = null as any;
      }
      usuarioExistente.usuario_modificacion = usuario || 'demo';
      await this.usuariosRepository.save(usuarioExistente);
      
      // ✅ Asignar rol PACIENTE si no lo tiene
      await this.asignarRolPaciente(usuarioExistente.id);
      
      return usuarioExistente;
    }

    // Si no existe, crear nuevo
    const nuevoUsuario = this.usuariosRepository.create({
      ...createUsuarioDto,
      email: emailLower,
      apellido: createUsuarioDto.apellido.toUpperCase(),
      nombre: createUsuarioDto.nombre.toUpperCase(),
      usuario_alta: usuario || 'demo',
    });

    const usuarioGuardado = await this.usuariosRepository.save(nuevoUsuario);
    
    // ✅ Asignar rol PACIENTE al nuevo usuario
    await this.asignarRolPaciente(usuarioGuardado.id);
    
    return usuarioGuardado;
  }

  // Crear usuario con auditoría
  async create(createUsuarioDto: CreateUsuarioDto, usuario?: string): Promise<Usuario> {
    const mxValido = await this.validarMX(createUsuarioDto.email);
    if (!mxValido) {
      throw new BadRequestException('El dominio del email no existe o no puede recibir correos');
    }

    const dominioValido = this.validarDominioConocido(createUsuarioDto.email);
    if (!dominioValido.valido) {
      throw new BadRequestException(dominioValido.sugerencia || 'El dominio del email no es válido');
    }

    const emailLower = createUsuarioDto.email.toLowerCase();
    
    const existente = await this.usuariosRepository.findOneBy({ 
      email: emailLower,
      fecha_baja: IsNull()
    });
    
    if (existente) {
      throw new BadRequestException('Ya existe un usuario activo con ese email');
    }

    const usuarioEntity = this.usuariosRepository.create({
      ...createUsuarioDto,
      email: emailLower,
      apellido: createUsuarioDto.apellido.toUpperCase(),
      nombre: createUsuarioDto.nombre.toUpperCase(),
      usuario_alta: usuario || 'demo',
    });

    const usuarioGuardado = await this.usuariosRepository.save(usuarioEntity);
    
    // ✅ Asignar rol PACIENTE
    await this.asignarRolPaciente(usuarioGuardado.id);
    
    return usuarioGuardado;
  }

  // Actualizar usuario con auditoría
  async update(id: number, updateUsuarioDto: UpdateUsuarioDto, usuario?: string): Promise<Usuario> {
    const usuarioExistente = await this.findOne(id);

    if (updateUsuarioDto.email) {
      const mxValido = await this.validarMX(updateUsuarioDto.email);
      if (!mxValido) {
        throw new BadRequestException('El dominio del email no existe o no puede recibir correos');
      }

      const dominioValido = this.validarDominioConocido(updateUsuarioDto.email);
      if (!dominioValido.valido) {
        throw new BadRequestException(dominioValido.sugerencia || 'El dominio del email no es válido');
      }

      updateUsuarioDto.email = updateUsuarioDto.email.toLowerCase();
    }

    if (updateUsuarioDto.apellido) {
      updateUsuarioDto.apellido = updateUsuarioDto.apellido.toUpperCase();
    }
    if (updateUsuarioDto.nombre) {
      updateUsuarioDto.nombre = updateUsuarioDto.nombre.toUpperCase();
    }

    Object.assign(usuarioExistente, updateUsuarioDto);
    usuarioExistente.usuario_modificacion = usuario || 'demo';

    return this.usuariosRepository.save(usuarioExistente);
  }

  // Soft delete con auditoría
  async softDelete(id: number, usuario?: string): Promise<void> {
    const usuarioExistente = await this.findOne(id);
    usuarioExistente.fecha_baja = new Date();
    usuarioExistente.usuario_baja = usuario || 'demo';

    await this.usuariosRepository.save(usuarioExistente);
  }

  // Debug de estructura de tabla
  async debugStructure(): Promise<any> {
    return this.usuariosRepository.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'usuario'
         OR table_name = 'usuarios';
    `);
  }
}
