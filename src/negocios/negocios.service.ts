// src/negocios/negocios.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Negocio } from './entities/negocio.entity';
import { CreateNegocioDto } from './dto/create-negocio.dto';
import { UpdateNegocioDto } from './dto/update-negocio.dto';
import { parsePhoneNumber } from 'libphonenumber-js';

@Injectable()
export class NegociosService {
  constructor(
    @InjectRepository(Negocio)
    private readonly negociosRepository: Repository<Negocio>,
  ) {}

  // ===== VALIDACIÓN DE WHATSAPP CON LIBPHONENUMBER =====
  private validarWhatsApp(country_code: number, national_number: string): string {
    // Construir el número completo para validar
    const numeroCompleto = `+${country_code}${national_number.replace(/\D/g, '')}`;
    
    try {
      const phoneNumber = parsePhoneNumber(numeroCompleto);
      
      // Verificar que sea un número válido según el país
      if (!phoneNumber || !phoneNumber.isValid()) {
        throw new BadRequestException('El número de WhatsApp no es válido para el país seleccionado');
      }
      
      // Opcional: verificar que sea un número móvil (no todos los países distinguen)
      // if (phoneNumber.getType() !== 'MOBILE') {
      //   throw new BadRequestException('El número debe ser un teléfono móvil');
      // }
      
      // Devolver el número en formato E.164
      return phoneNumber.number;
      
    } catch (error) {
      throw new BadRequestException('Error al validar el número de WhatsApp: ' + error.message);
    }
  }

  // ===== FUNCIÓN PARA GENERAR URL ÚNICA =====
  private async generarUrlUnica(nombre: string): Promise<string> {
    let baseUrl = nombre
      .toLowerCase()
      .trim()
      .replace(/[áäâà]/g, 'a')
      .replace(/[éëêè]/g, 'e')
      .replace(/[íïîì]/g, 'i')
      .replace(/[óöôò]/g, 'o')
      .replace(/[úüûù]/g, 'u')
      .replace(/[ñ]/g, 'n')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (!baseUrl) {
      baseUrl = 'negocio';
    }

    let url = baseUrl;
    let contador = 1;

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

  // Obtener un negocio por URL
  async findByUrl(url: string): Promise<Negocio | null> {
    return this.negociosRepository.findOneBy({ 
      url,
      fecha_baja: IsNull() 
    });
  }

  // Crear negocio con auditoría
  async create(createNegocioDto: CreateNegocioDto, usuario?: string): Promise<Negocio> {
    // 1. Validar WhatsApp con libphonenumber
    const whatsappE164 = this.validarWhatsApp(
      createNegocioDto.country_code,
      createNegocioDto.national_number
    );

    // 2. Generar URL única
    const url = await this.generarUrlUnica(createNegocioDto.nombre);

    // 3. Crear la entidad (el hook @BeforeInsert generará whatsapp_e164)
    const negocioEntity = this.negociosRepository.create({
      ...createNegocioDto,
      url,
      // Aseguramos que el formato E164 sea el validado
      whatsapp_e164: whatsappE164,
      usuario_alta: usuario || 'demo',
    });

    return this.negociosRepository.save(negocioEntity);
  }

  // Actualizar negocio con auditoría
  async update(id: number, updateNegocioDto: UpdateNegocioDto, usuario?: string): Promise<Negocio> {
    const negocioExistente = await this.findOne(id);

    // Si se actualizan campos de WhatsApp, validar nuevamente
    if (updateNegocioDto.country_code || updateNegocioDto.national_number) {
      const country_code = updateNegocioDto.country_code ?? negocioExistente.country_code;
      const national_number = updateNegocioDto.national_number ?? negocioExistente.national_number;
      
      const whatsappE164 = this.validarWhatsApp(country_code, national_number);
      
      // Actualizar los campos
      if (updateNegocioDto.country_code) {
        negocioExistente.country_code = updateNegocioDto.country_code;
      }
      if (updateNegocioDto.national_number) {
        negocioExistente.national_number = updateNegocioDto.national_number;
      }
      
      // El hook @BeforeUpdate generará whatsapp_e164 automáticamente
    }

    // Si se actualiza el nombre, no regeneramos URL automáticamente
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
