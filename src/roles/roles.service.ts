// src/roles/roles.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Rol } from './entities/rol.entity';
import { CreateRolDto } from './dto/create-rol.dto';
import { UpdateRolDto } from './dto/update-rol.dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Rol)
    private readonly rolesRepository: Repository<Rol>,
  ) {}

  // Obtener todos los roles
  async findAll(): Promise<Rol[]> {
    return this.rolesRepository.find();
  }

  // Obtener un rol por ID
  async findOne(id: number): Promise<Rol> {
    const rol = await this.rolesRepository.findOneBy({ id });

    if (!rol) {
      throw new NotFoundException(`Rol con id ${id} no encontrado`);
    }

    return rol;
  }

  // Obtener un rol por nombre (útil para asignaciones)
  async findByNombre(nombre: string): Promise<Rol | null> {
    return this.rolesRepository.findOneBy({ 
      nombre: nombre.toUpperCase(),
      fecha_baja: IsNull() 
    });
  }

  // Crear rol con auditoría
  async create(createRolDto: CreateRolDto, usuario?: string): Promise<Rol> {
    // Verificar si ya existe un rol activo con ese nombre
    const nombreUpper = createRolDto.nombre.toUpperCase();
    
    const existente = await this.rolesRepository.findOneBy({ 
      nombre: nombreUpper,
      fecha_baja: IsNull() 
    });
    
    if (existente) {
      throw new BadRequestException('Ya existe un rol activo con ese nombre');
    }

    const rolEntity = this.rolesRepository.create({
      ...createRolDto,
      nombre: nombreUpper,
      usuario_alta: usuario || 'demo',
    });

    return this.rolesRepository.save(rolEntity);
  }

  // Actualizar rol con auditoría
  async update(id: number, updateRolDto: UpdateRolDto, usuario?: string): Promise<Rol> {
    const rolExistente = await this.findOne(id);

    // Si se actualiza el nombre, verificar que no exista otro con ese nombre
    if (updateRolDto.nombre) {
      const nombreUpper = updateRolDto.nombre.toUpperCase();
      
      const existente = await this.rolesRepository.findOneBy({ 
        nombre: nombreUpper,
        fecha_baja: IsNull() 
      });
      
      if (existente && existente.id !== id) {
        throw new BadRequestException('Ya existe otro rol activo con ese nombre');
      }
      
      updateRolDto.nombre = nombreUpper;
    }

    Object.assign(rolExistente, updateRolDto);
    rolExistente.usuario_modificacion = usuario || 'demo';

    return this.rolesRepository.save(rolExistente);
  }

  // Soft delete con auditoría
  async softDelete(id: number, usuario?: string): Promise<void> {
    const rolExistente = await this.findOne(id);
    rolExistente.fecha_baja = new Date();
    rolExistente.usuario_baja = usuario || 'demo';

    await this.rolesRepository.save(rolExistente);
  }

  // Debug de estructura de tabla
  async debugStructure(): Promise<any> {
    return this.rolesRepository.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'rol'
         OR table_name = 'roles';
    `);
  }
}
