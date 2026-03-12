// src/negocios/negocios.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Negocio } from './entities/negocio.entity';
import { CreateNegocioDto } from './dto/create-negocio.dto';
import { UpdateNegocioDto } from './dto/update-negocio.dto';

@Injectable()
export class NegociosService {
  constructor(
    @InjectRepository(Negocio)
    private readonly negociosRepository: Repository<Negocio>,
  ) {}

  // ===== FUNCIÓN PARA GENERAR URL ÚNICA =====
  private async generarUrlUnica(nombre: string): Promise<string> {
    // Convertir a minúsculas, reemplazar espacios y caracteres especiales
    let baseUrl = nombre
      .toLowerCase()
      .trim()
      .replace(/[áäâà]/g, 'a')
      .replace(/[éëêè]/g, 'e')
      .replace(/[íïîì]/g, 'i')
      .replace(/[óöôò]/g, 'o')
      .replace(/[úüûù]/g, 'u')
      .replace(/[ñ]/g, 'n')
      .replace(/[^a-z0-9]+/g, '-') // Reemplazar caracteres no válidos por guiones
      .replace(/^-+|-+$/g, '');     // Eliminar guiones al inicio o final

    if (!baseUrl) {
      baseUrl = 'negocio';
    }

    let url = baseUrl;
    let contador = 1;

    // Verificar si la URL ya existe
    while (await this.negociosRepository.findOneBy({ url, fecha_baja: IsNull() })) {
      url = `${baseUrl}-${contador}`;
      contador++;
    }

    return url;
  }

  // Obtener todos los negocios
  async findAll(): Promise<Negocio[]> {
    return this.negociosRepository.find();
  }

  // Obtener un negocio por ID
  async findOne(id: number): Promise<Negocio> {
    const negocio = await this.negociosRepository.findOneBy({ id });

    if (!negocio) {
      throw new NotFoundException(`Negocio con id ${id} no encontrado`);
    }

    return negocio;
  }

  // Obtener un negocio por URL (para la agenda pública)
  async findByUrl(url: string): Promise<Negocio | null> {
    return this.negociosRepository.findOneBy({ 
      url,
      fecha_baja: IsNull() 
    });
  }

  // Crear negocio con auditoría y generación automática de URL
  async create(createNegocioDto: CreateNegocioDto, usuario?: string): Promise<Negocio> {
    // Generar URL única basada en el nombre
    const url = await this.generarUrlUnica(createNegocioDto.nombre);

    const negocioEntity = this.negociosRepository.create({
      ...createNegocioDto,
      url, // URL generada automáticamente
      usuario_alta: usuario || 'demo',
    });

    return this.negociosRepository.save(negocioEntity);
  }

  // Actualizar negocio con auditoría
  async update(id: number, updateNegocioDto: UpdateNegocioDto, usuario?: string): Promise<Negocio> {
    const negocioExistente = await this.findOne(id);

    // Si se actualiza el nombre, regenerar la URL (opcional)
    // Por ahora, no regeneramos URL automáticamente para evitar romper enlaces existentes
    // Si se quisiera, habría que implementar lógica similar a create()

    Object.assign(negocioExistente, updateNegocioDto);
    negocioExistente.usuario_modificacion = usuario || 'demo';

    return this.negociosRepository.save(negocioExistente);
  }

  // Soft delete con auditoría
  async softDelete(id: number, usuario?: string): Promise<void> {
    const negocioExistente = await this.findOne(id);
    negocioExistente.fecha_baja = new Date();
    negocioExistente.usuario_baja = usuario || 'demo';

    await this.negociosRepository.save(negocioExistente);
  }

  // Debug de estructura de tabla
  async debugStructure(): Promise<any> {
    return this.negociosRepository.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'negocio'
         OR table_name = 'negocios';
    `);
  }
}
