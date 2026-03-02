// src/filial/filial.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Filial } from '../entities/filial.entity';

@Injectable()
export class FilialService {
  constructor(
    @InjectRepository(Filial)
    private readonly filialRepository: Repository<Filial>,
  ) {}

  // Obtener todas las filiales
  async findAll(): Promise<Filial[]> {
    return this.filialRepository.find();
  }

  // Obtener una filial por ID
  async findOne(id: number): Promise<Filial> {
    const filial = await this.filialRepository.findOneBy({ id });

    if (!filial) {
      throw new NotFoundException(`Filial with id ${id} not found`);
    }

    return filial;
  }

  // Crear filial con auditoría
  async create(data: Partial<Filial>, usuario?: string): Promise<Filial> {
    const filial = this.filialRepository.create({
      ...data,
      usuario_alta: usuario || 'demo', // usuario que crea el registro
    });

    return this.filialRepository.save(filial);
  }

  // Actualizar filial con auditoría
  async update(id: number, data: Partial<Filial>, usuario?: string): Promise<Filial> {
    const filial = await this.findOne(id);

    Object.assign(filial, data);
    filial.usuario_modificacion = usuario || 'demo'; // usuario que modifica

    return this.filialRepository.save(filial);
  }

  // Soft delete con auditoría
  async softDelete(id: number, usuario?: string): Promise<void> {
    const filial = await this.findOne(id);
    filial.fecha_baja = new Date();
    filial.usuario_baja = usuario || 'demo';

    await this.filialRepository.save(filial);
  }

  // Debug de estructura de tabla
  async debugStructure(): Promise<any> {
    return this.filialRepository.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'filial'
         OR table_name = 'filiales';
    `);
  }
}
