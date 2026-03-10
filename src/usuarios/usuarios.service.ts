// src/usuarios/usuarios.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Usuario } from './entities/usuario.entity';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { DOMINIOS_VALIDOS } from './constants/dominios-email';
import * as dns from 'dns';
import { promisify } from 'util';

const resolveMx = promisify(dns.resolveMx);

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
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
    
    // Si el dominio está en la lista de conocidos, es válido
    if (DOMINIOS_VALIDOS.includes(dominio)) {
      return { valido: true };
    }
    
    // Detectar errores comunes en Gmail
    if (dominio.startsWith('gmail.')) {
      return { 
        valido: false, 
        sugerencia: '¿Quisiste decir gmail.com?' 
      };
    }
    
    // Detectar gnail → gmail
    if (dominio === 'gnail.com' || dominio === 'gmai.com' || dominio === 'gmal.com') {
      return { 
        valido: false, 
        sugerencia: '¿Quisiste decir gmail.com?' 
      };
    }
    
    // Detectar hotmal / hotmil → hotmail
    if (dominio.includes('hotmail') && dominio !== 'hotmail.com' && !dominio.endsWith('.com')) {
      return { 
        valido: false, 
        sugerencia: 'Los dominios de Hotmail suelen ser hotmail.com, hotmail.com.ar, etc.' 
      };
    }
    
    // Detectar yahoo errores comunes
    if (dominio === 'yahooo.com' || dominio === 'yahoo.com.ar' || dominio === 'yahoo.com') {
      return { valido: true }; // estos sí son válidos
    }
    if (dominio.startsWith('yahoo.') && dominio !== 'yahoo.com') {
      return { 
        valido: false, 
        sugerencia: '¿Quisiste decir yahoo.com?' 
      };
    }
    
    // Detectar outlook errores
    if (dominio === 'outlook.com' || dominio === 'outlook.com.ar' || dominio === 'outlook.com.mx') {
      return { valido: true };
    }
    if (dominio.startsWith('outlook.') && !dominio.endsWith('.com')) {
      return { 
        valido: false, 
        sugerencia: '¿Quisiste decir outlook.com?' 
      };
    }
    
    // Si el dominio tiene MX pero no está en lista, lo aceptamos pero con advertencia
    return { 
      valido: true, 
      sugerencia: 'El dominio es válido pero poco común. Verificá que sea correcto.' 
    };
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

  // Crear usuario con auditoría
  async create(createUsuarioDto: CreateUsuarioDto, usuario?: string): Promise<Usuario> {
    // Validar MX records del dominio
    const mxValido = await this.validarMX(createUsuarioDto.email);
    if (!mxValido) {
      throw new BadRequestException('El dominio del email no existe o no puede recibir correos');
    }

    // Validar dominio conocido y obtener sugerencia
    const dominioValido = this.validarDominioConocido(createUsuarioDto.email);
    if (!dominioValido.valido) {
      throw new BadRequestException(dominioValido.sugerencia || 'El dominio del email no es válido');
    }

    // Convertir email a minúsculas
    const emailLower = createUsuarioDto.email.toLowerCase();
    
    // Verificar si ya existe un usuario activo con ese email
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

    return this.usuariosRepository.save(usuarioEntity);
  }

  // Actualizar usuario con auditoría
  async update(id: number, updateUsuarioDto: UpdateUsuarioDto, usuario?: string): Promise<Usuario> {
    const usuarioExistente = await this.findOne(id);

    // Si se actualiza el email, validar MX y dominio
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

    // Si se actualiza apellido o nombre, pasarlos a mayúsculas
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
