import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Actividad } from './entities/actividad.entity';
import { CreateActividadDto } from './dto/create-actividad.dto';
import { UpdateActividadDto } from './dto/update-actividad.dto';

@Injectable()
export class ActividadService {
  constructor(
    @InjectRepository(Actividad)
    private readonly actividadRepository: Repository<Actividad>,
  ) {}

  // ===== FUNCIÓN PARA GENERAR PREFIJO ÚNICO =====
  private generarPrefijoUnico(nombre: string, prefijosExistentes: string[]): string {
    // Limpiar nombre: mayúsculas, sin acentos
    const nombreLimpio = nombre
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z]/g, '');

    // Si el nombre tiene menos de 4 letras, usar el nombre completo
    if (nombreLimpio.length <= 4) {
      let prefijo = nombreLimpio;
      let contador = 0;
      while (prefijosExistentes.includes(prefijo)) {
        contador++;
        prefijo = nombreLimpio + contador;
      }
      return prefijo;
    }

    // Tomar primeras 3 letras fijas
    const base = nombreLimpio.substring(0, 3);
    
    // Intentar con la cuarta letra
    let posicion = 3;
    let prefijo = base + nombreLimpio.charAt(posicion);
    
    while (prefijosExistentes.includes(prefijo) && posicion < nombreLimpio.length - 1) {
      posicion++;
      prefijo = base + nombreLimpio.charAt(posicion);
    }
    
    // Si aún existe conflicto, agregar número
    let contador = 1;
    while (prefijosExistentes.includes(prefijo)) {
      contador++;
      prefijo = base + nombreLimpio.charAt(posicion) + contador;
    }
    
    return prefijo;
  }

  // ===== FUNCIÓN PARA GENERAR CÓDIGO COMPLETO =====
  private async generarCodigo(nombre: string): Promise<string> {
    // Obtener todos los códigos existentes
    const todas = await this.actividadRepository.find();
    
    // Extraer prefijos únicos existentes
    const prefijosExistentes = todas
      .map(a => a.codigo.split('-')[0])
      .filter((v, i, a) => a.indexOf(v) === i);
    
    // Generar prefijo único
    const prefijo = this.generarPrefijoUnico(nombre, prefijosExistentes);
    
    // Buscar el último número para este prefijo
    const ultimoConPrefijo = await this.actividadRepository.findOne({
      where: { codigo: `${prefijo}%` },
      order: { id: 'DESC' },
    });
    
    let numero = 1;
    if (ultimoConPrefijo && ultimoConPrefijo.codigo) {
      const match = ultimoConPrefijo.codigo.match(/-(\d+)$/);
      if (match) {
        numero = parseInt(match[1], 10) + 1;
      }
    }
    
    return `${prefijo}-${numero.toString().padStart(3, '0')}`;
  }

  // ===== FUNCIONES AUXILIARES =====
  private async verificarNombreUnico(nombre: string, id?: number): Promise<void> {
    const existente = await this.actividadRepository.findOne({
      where: { nombre: nombre.toUpperCase() },
    });

    if (existente && existente.id !== id) {
      throw new BadRequestException(`Ya existe una actividad con el nombre "${nombre}"`);
    }
  }

  // ===== CRUD =====
  async findAll(): Promise<Actividad[]> {
    return this.actividadRepository.find();
  }

  async findOne(id: number): Promise<Actividad> {
    const actividad = await this.actividadRepository.findOne({
      where: { id },
    });

    if (!actividad) {
      throw new NotFoundException(`Actividad con id ${id} no encontrada`);
    }

    return actividad;
  }

  async create(createActividadDto: CreateActividadDto, usuario?: string): Promise<Actividad> {
    // Validar que el nombre no exista
    await this.verificarNombreUnico(createActividadDto.nombre);

    // Generar código único
    const codigo = await this.generarCodigo(createActividadDto.nombre);

    const actividad = this.actividadRepository.create({
      ...createActividadDto,
      nombre: createActividadDto.nombre.toUpperCase(),
      codigo,
      virtual: createActividadDto.virtual || false,
      usuario_alta: usuario || 'demo',
    });

    return this.actividadRepository.save(actividad);
  }

  async update(id: number, updateActividadDto: UpdateActividadDto, usuario?: string): Promise<Actividad> {
    const actividad = await this.findOne(id);

    // Si se actualiza el nombre, verificar que no exista otro con ese nombre
    if (updateActividadDto.nombre) {
      await this.verificarNombreUnico(updateActividadDto.nombre, id);
      updateActividadDto.nombre = updateActividadDto.nombre.toUpperCase();
    }

    Object.assign(actividad, updateActividadDto);
    actividad.usuario_modificacion = usuario || 'demo';

    return this.actividadRepository.save(actividad);
  }

  async softDelete(id: number, usuario?: string): Promise<void> {
    const actividad = await this.findOne(id);
    actividad.fecha_baja = new Date();
    actividad.usuario_baja = usuario || 'demo';

    await this.actividadRepository.save(actividad);
  }

  async debugStructure(): Promise<any> {
    return this.actividadRepository.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'actividad';
    `);
  }
}
