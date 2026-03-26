import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Centro } from './entities/centro.entity';
import { CreateCentroDto, DomicilioDto } from './dto/create-centro.dto';
import { UpdateCentroDto } from './dto/update-centro.dto';
import { parsePhoneNumber } from 'libphonenumber-js';

@Injectable()
export class CentroService {
  constructor(
    @InjectRepository(Centro)
    private readonly centroRepository: Repository<Centro>,
  ) {}

  // ===== VALIDACIÓN DE WHATSAPP =====
  private validarWhatsApp(country_code: number, national_number: string): string {
    const numeroCompleto = `+${country_code}${national_number.replace(/\D/g, '')}`;
    
    try {
      const phoneNumber = parsePhoneNumber(numeroCompleto);
      
      if (!phoneNumber || !phoneNumber.isValid()) {
        throw new BadRequestException('El número de WhatsApp no es válido para el país seleccionado');
      }
      
      return phoneNumber.number;
      
    } catch (error) {
      throw new BadRequestException('Error al validar el número de WhatsApp: ' + error.message);
    }
  }

  // ===== VALIDACIÓN DE DIRECCIÓN =====
  private validarDireccion(domicilio: DomicilioDto) {
    const camposRequeridos = [
      'street', 'street_number', 'postal_code', 'city', 
      'state', 'country', 'country_code', 'latitude', 
      'longitude', 'formatted_address'
    ];

    for (const campo of camposRequeridos) {
      if (!domicilio[campo]) {
        throw new BadRequestException(`El campo ${campo} de la dirección es obligatorio`);
      }
    }

    if (isNaN(domicilio.latitude) || domicilio.latitude < -90 || domicilio.latitude > 90) {
      throw new BadRequestException('La latitud debe ser un número entre -90 y 90');
    }

    if (isNaN(domicilio.longitude) || domicilio.longitude < -180 || domicilio.longitude > 180) {
      throw new BadRequestException('La longitud debe ser un número entre -180 y 180');
    }

    if (!/^[A-Z]{2}$/.test(domicilio.country_code)) {
      throw new BadRequestException('El código de país debe tener 2 letras mayúsculas (ISO 3166-1 alpha-2)');
    }

    if (domicilio.formatted_address.length < 10) {
      throw new BadRequestException('La dirección no parece válida');
    }

    return true;
  }

  // ===== FUNCIÓN PARA GENERAR CÓDIGO ÚNICO POR NEGOCIO =====
  private async generarCodigoUnico(negocioId: number): Promise<string> {
    // Buscar el último centro de este negocio
    const ultimoCentro = await this.centroRepository.findOne({
      where: { negocioId, fecha_baja: IsNull() },
      order: { id: 'DESC' },
    });

    let numero = 1;
    if (ultimoCentro && ultimoCentro.codigo) {
      const match = ultimoCentro.codigo.match(/C-(\d+)/);
      if (match) {
        numero = parseInt(match[1], 10) + 1;
      }
    }

    // Formato con 3 dígitos: C-001, C-002, ..., C-999
    return `C-${numero.toString().padStart(3, '0')}`;
  }

  // ===== CRUD =====
  async findAll(): Promise<Centro[]> {
    return this.centroRepository.find({
      relations: ['negocio'],
    });
  }

  async findOne(id: number): Promise<Centro> {
    const centro = await this.centroRepository.findOne({
      where: { id },
      relations: ['negocio'],
    });

    if (!centro) {
      throw new NotFoundException(`Centro con id ${id} no encontrado`);
    }

    return centro;
  }

  async findByNegocio(negocioId: number): Promise<Centro[]> {
    return this.centroRepository.find({
      where: { negocioId, fecha_baja: IsNull() },
      relations: ['negocio'],
    });
  }

  async create(createCentroDto: CreateCentroDto, usuario?: string): Promise<Centro> {
    // 1. Validar WhatsApp
    const whatsappE164 = this.validarWhatsApp(
      createCentroDto.country_code,
      createCentroDto.national_number
    );

    // 2. Validar dirección
    this.validarDireccion(createCentroDto.domicilio);

    // 3. Generar código único por negocio
    const codigo = await this.generarCodigoUnico(createCentroDto.negocioId);

    // 4. Crear la entidad
    const centroEntity = this.centroRepository.create({
      negocioId: createCentroDto.negocioId,
      nombre: createCentroDto.nombre.toUpperCase(),
      codigo,
      country_code: createCentroDto.country_code,
      national_number: createCentroDto.national_number,
      whatsapp_e164: whatsappE164,
      // Mapear domicilio
      street: createCentroDto.domicilio.street,
      street_number: createCentroDto.domicilio.street_number,
      postal_code: createCentroDto.domicilio.postal_code,
      city: createCentroDto.domicilio.city,
      state: createCentroDto.domicilio.state,
      country: createCentroDto.domicilio.country,
      country_code_iso: createCentroDto.domicilio.country_code,
      latitude: createCentroDto.domicilio.latitude,
      longitude: createCentroDto.domicilio.longitude,
      formatted_address: createCentroDto.domicilio.formatted_address,
      usuario_alta: usuario || 'demo',
    });

    return this.centroRepository.save(centroEntity);
  }

  async update(id: number, updateCentroDto: UpdateCentroDto, usuario?: string): Promise<Centro> {
    const centroExistente = await this.findOne(id);

    // Si se actualizan campos de WhatsApp, validar nuevamente
    if (updateCentroDto.country_code || updateCentroDto.national_number) {
      const country_code = updateCentroDto.country_code ?? centroExistente.country_code;
      const national_number = updateCentroDto.national_number ?? centroExistente.national_number;
      
      const whatsappE164 = this.validarWhatsApp(country_code, national_number);
      centroExistente.whatsapp_e164 = whatsappE164;
    }

    // Si se actualiza el domicilio, validar
    if (updateCentroDto.domicilio) {
      this.validarDireccion(updateCentroDto.domicilio);
      
      centroExistente.street = updateCentroDto.domicilio.street;
      centroExistente.street_number = updateCentroDto.domicilio.street_number;
      centroExistente.postal_code = updateCentroDto.domicilio.postal_code;
      centroExistente.city = updateCentroDto.domicilio.city;
      centroExistente.state = updateCentroDto.domicilio.state;
      centroExistente.country = updateCentroDto.domicilio.country;
      centroExistente.country_code_iso = updateCentroDto.domicilio.country_code;
      centroExistente.latitude = updateCentroDto.domicilio.latitude;
      centroExistente.longitude = updateCentroDto.domicilio.longitude;
      centroExistente.formatted_address = updateCentroDto.domicilio.formatted_address;
    }

    // Actualizar otros campos
    if (updateCentroDto.nombre) {
      centroExistente.nombre = updateCentroDto.nombre.toUpperCase();
    }
    if (updateCentroDto.negocioId) {
      centroExistente.negocioId = updateCentroDto.negocioId;
    }
    if (updateCentroDto.country_code) {
      centroExistente.country_code = updateCentroDto.country_code;
    }
    if (updateCentroDto.national_number) {
      centroExistente.national_number = updateCentroDto.national_number;
    }

    centroExistente.usuario_modificacion = usuario || 'demo';

    return this.centroRepository.save(centroExistente);
  }

  async softDelete(id: number, usuario?: string): Promise<void> {
    const centroExistente = await this.findOne(id);
    centroExistente.fecha_baja = new Date();
    centroExistente.usuario_baja = usuario || 'demo';

    await this.centroRepository.save(centroExistente);
  }

  async debugStructure(): Promise<any> {
    return this.centroRepository.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'centro';
    `);
  }
}
