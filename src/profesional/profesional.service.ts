import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profesional } from './entities/profesional.entity';
import { CreateProfesionalDto } from './dto/create-profesional.dto';
import { UpdateProfesionalDto } from './dto/update-profesional.dto';

@Injectable()
export class ProfesionalService {
  constructor(
    @InjectRepository(Profesional)
    private readonly profesionalRepository: Repository<Profesional>,
  ) {}

  // ===== FUNCIONES AUXILIARES =====
  private async verificarDocumentoUnico(documento: string, id?: number): Promise<void> {
    const existente = await this.profesionalRepository.findOne({
      where: { documento },
    });

    if (existente && existente.id !== id) {
      throw new BadRequestException(`Ya existe un profesional con el documento "${documento}"`);
    }
  }

  private async verificarEmailUnico(email: string, id?: number): Promise<void> {
    const existente = await this.profesionalRepository.findOne({
      where: { email },
    });

    if (existente && existente.id !== id) {
      throw new BadRequestException(`Ya existe un profesional con el email "${email}"`);
    }
  }

  private async verificarUnicidad(documento: string, email: string, id?: number): Promise<void> {
    await this.verificarDocumentoUnico(documento, id);
    await this.verificarEmailUnico(email, id);
  }

  // ===== CRUD =====
  async findAll(): Promise<Profesional[]> {
    return this.profesionalRepository.find();
  }

  async findOne(id: number): Promise<Profesional> {
    const profesional = await this.profesionalRepository.findOne({
      where: { id },
    });

    if (!profesional) {
      throw new NotFoundException(`Profesional con id ${id} no encontrado`);
    }

    return profesional;
  }

  async create(createProfesionalDto: CreateProfesionalDto, usuario?: string): Promise<Profesional> {
    // Validar unicidad de documento y email
    await this.verificarUnicidad(
      createProfesionalDto.documento,
      createProfesionalDto.email,
    );

    const profesional = this.profesionalRepository.create({
      ...createProfesionalDto,
      usuario_alta: usuario || 'demo',
    });

    return this.profesionalRepository.save(profesional);
  }

  async update(id: number, updateProfesionalDto: UpdateProfesionalDto, usuario?: string): Promise<Profesional> {
    const profesional = await this.findOne(id);

    // Si se actualiza documento o email, verificar unicidad
    if (updateProfesionalDto.documento || updateProfesionalDto.email) {
      await this.verificarUnicidad(
        updateProfesionalDto.documento || profesional.documento,
        updateProfesionalDto.email || profesional.email,
        id,
      );
    }

    Object.assign(profesional, updateProfesionalDto);
    profesional.usuario_modificacion = usuario || 'demo';

    return this.profesionalRepository.save(profesional);
  }

  async softDelete(id: number, usuario?: string): Promise<void> {
    const profesional = await this.findOne(id);
    profesional.fecha_baja = new Date();
    profesional.usuario_baja = usuario || 'demo';

    await this.profesionalRepository.save(profesional);
  }

  async reactivate(id: number, usuario?: string): Promise<Profesional> {
    const profesional = await this.findOne(id);
    
    if (!profesional.fecha_baja) {
      throw new BadRequestException(`El profesional ya está activo`);
    }

    profesional.fecha_baja = null;
    profesional.usuario_baja = null;
    profesional.usuario_modificacion = usuario || 'demo';

    return this.profesionalRepository.save(profesional);
  }

  async debugStructure(): Promise<any> {
    return this.profesionalRepository.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'profesional';
    `);
  }
}
