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
    const count = await this.centroRepository.count({
      where: { negocioId },
    });

    const numero = count + 1;
    return `C-${numero.toString().padStart(3, '0')}`;
  }

  // ===== VERIFICAR SI EL NEGOCIO YA TIENE UN CENTRO VIRTUAL =====
  private async verificarCentroVirtualUnico(negocioId: number, es_virtual?: boolean, id?: number): Promise<void> {
    if (!es_virtual) return;
    
    const existeVirtual = await this.centroRepository.findOne({
      where: { negocioId, es_virtual: true, fecha_baja: IsNull() },
    });
    
    if (existeVirtual && existeVirtual.id !== id) {
      throw new BadRequestException('Este negocio ya tiene un centro virtual. Solo se permite uno.');
    }
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

    // 2. Validar que no haya otro centro virtual para este negocio
    await this.verificarCentroVirtualUnico(createCentroDto.negocioId, createCentroDto.es_virtual);

    // 3. Validar dirección (obligatoria si no es virtual)
    if (!createCentroDto.es_virtual) {
      if (!createCentroDto.domicilio || !createCentroDto.domicilio.formatted_address) {
        throw new BadRequestException('El domicilio es obligatorio para centros físicos');
      }
      this.validarDireccion(createCentroDto.domicilio);
    }

    // 4. Generar código único por negocio
    const codigo = await this.generarCodigoUnico(createCentroDto.negocioId);

    // 5. Crear la entidad
    const centroData: any = {
      negocioId: createCentroDto.negocioId,
      nombre: createCentroDto.nombre.toUpperCase(),
      codigo,
      es_virtual: createCentroDto.es_virtual || false,
      country_code: createCentroDto.country_code,
      national_number: createCentroDto.national_number,
      whatsapp_e164: whatsappE164,
      usuario_alta: usuario || 'demo',
    };

    // Solo agregar domicilio si no es virtual
    if (!createCentroDto.es_virtual && createCentroDto.domicilio) {
      centroData.street = createCentroDto.domicilio.street;
      centroData.street_number = createCentroDto.domicilio.street_number;
      centroData.postal_code = createCentroDto.domicilio.postal_code;
      centroData.city = createCentroDto.domicilio.city;
      centroData.state = createCentroDto.domicilio.state;
      centroData.country = createCentroDto.domicilio.country;
      centroData.country_code_iso = createCentroDto.domicilio.country_code;
      centroData.latitude = createCentroDto.domicilio.latitude;
      centroData.longitude = createCentroDto.domicilio.longitude;
      centroData.formatted_address = createCentroDto.domicilio.formatted_address;
    }

    const centroEntity = this.centroRepository.create(centroData);
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

    // Validar que no haya conflicto con otro centro virtual
    if (updateCentroDto.es_virtual !== undefined) {
      await this.verificarCentroVirtualUnico(centroExistente.negocioId, updateCentroDto.es_virtual, id);
    }

    // Si se actualiza el domicilio y no es virtual, validar
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
    if (updateCentroDto.es_virtual !== undefined) {
      centroExistente.es_virtual = updateCentroDto.es_virtual;
    }

    // Para reactivar (enviar null) - usar Object.assign para evitar errores de tipo
    if (updateCentroDto.fecha_baja !== undefined) {
      (centroExistente as any).fecha_baja = updateCentroDto.fecha_baja;
    }
    if (updateCentroDto.usuario_baja !== undefined) {
      (centroExistente as any).usuario_baja = updateCentroDto.usuario_baja;
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
