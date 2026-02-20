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

  async findAll(): Promise<Filial[]> {
    return this.filialRepository.find();
  }

  async findOne(id: number): Promise<Filial> {
    const filial = await this.filialRepository.findOneBy({ id });

    if (!filial) {
      throw new NotFoundException(`Filial with id ${id} not found`);
    }

    return filial;
  }

  async create(data: Partial<Filial>): Promise<Filial> {
    const filial = this.filialRepository.create(data);
    return this.filialRepository.save(filial);
  }
}
