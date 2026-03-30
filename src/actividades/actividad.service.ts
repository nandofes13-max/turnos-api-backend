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
    const nombreLimpio = nombre
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z]/g, '');

    if (nombreLimpio.length <= 4) {
      let prefijo = nombreLimpio;
      let contador = 0;
      while (prefijosExistentes.includes(prefijo)) {
        contador++;
        prefijo = nombreLimpio + contador;
      }
      return prefijo;
    }

    const base = nombreLimpio.substring(0, 3);
    let posicion = 3;
    let prefijo = base + nombreLimpio.charAt(posicion);
    
    while (prefijosExistentes.includes(prefijo) && posicion < nombreLimpio.length - 1) {
      posicion++;
      prefijo = base + nombreLimpio.charAt(posicion);
    }
    
    let contador = 1;
    while (prefijosExistentes.includes(prefijo)) {
      contador++;
      prefijo = base + nombreLimpio.charAt(posicion) + contador;
    }
    
    return prefijo;
  }

  // ===== FUNCIÓN PARA GENERAR CÓDIGO COMPLETO =====
  private async generarCodigo(nombre: string): Promise<string> {
    const todas = await this.actividadRepository.find();
    
    const prefijosExistentes = todas
      .map(a => a.codigo ? a.codigo.split('-')[0] : '')
      .filter((v, i, a) => v && a.indexOf(v) === i);
    
    const prefijo = this.generarPrefijoUnico(nombre, prefijosExistentes);
    
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

  // ===== FUNCIÓN TEMPORAL PARA GENERAR CÓDIGOS DE ACTIVIDADES EXISTENTES =====
  async generarCodigosParaExistentes(usuario?: string): Promise<{ actualizadas: number }> {
    const actividades = await this.actividadRepository.find();
    let contador = 0;

    for (const actividad of actividades) {
      if (!actividad.codigo) {
        const codigo = await this.generarCodigo(actividad.nombre);
        actividad.codigo = codigo;
        actividad.usuario_modificacion = usuario || 'demo';
        await this.actividadRepository.save(actividad);
        contador++;
        console.log(`✅ Generado código ${codigo} para actividad ${actividad.nombre}`);
      }
    }

    return { actualizadas: contador };
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
    await this.verificarNombreUnico(createActividadDto.nombre);

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
