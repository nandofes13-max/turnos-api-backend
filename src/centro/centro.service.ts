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

  // ===== OBTENER TIMEZONE DESDE COORDENADAS (TimezoneDB) =====
  private async obtenerTimezoneDesdeCoordenadas(lat: number, lng: number): Promise<string> {
    const API_KEY = 'DAPTMA97YA6B';  // Tu API key de TimezoneDB
    
    try {
      const url = `https://api.timezonedb.com/v2.1/get-time-zone?key=${API_KEY}&format=json&by=position&lat=${lat}&lng=${lng}`;
      console.log(`Consultando timezone para centro - lat: ${lat}, lng: ${lng}`);
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'OK' && data.zoneName) {
        console.log(`✅ Timezone obtenido para centro: ${data.zoneName}`);
        return data.zoneName;
      } else {
        console.error('Error TimezoneDB:', data.message);
        return 'America/Argentina/Buenos_Aires';
      }
    } catch (error) {
      console.error('Error en API timezone:', error);
      return 'America/Argentina/Buenos_Aires';
    }
  }

  // ===== OBTENER TIMEZONE DEL NEGOCIO (para centros virtuales) - SQL DIRECTO =====
  private async obtenerTimezoneDesdeNegocio(negocioId: number): Promise<string> {
    try {
      const result = await this.centroRepository.query(
        `SELECT timezone FROM negocio WHERE id = $1`,
        [negocioId]
      );
      
      if (result && result[0] && result[0].timezone) {
        console.log(`Timezone heredado del negocio ${negocioId}: ${result[0].timezone}`);
        return result[0].timezone;
      }
      return 'America/Argentina/Buenos_Aires';
    } catch (error) {
      console.error('Error obteniendo timezone del negocio:', error);
      return 'America/Argentina/Buenos_Aires';
    }
  }

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

  private async generarCodigoUnico(negocioId: number): Promise<string> {
    const count = await this.centroRepository.count({
      where: { negocioId },
    });

    const numero = count + 1;
    return `C-${numero.toString().padStart(3, '0')}`;
  }

  private async verificarCentroVirtualUnico(negocioId: number, es_virtual?: boolean, id?: number): Promise<void> {
    if (!es_virtual) return;
    
    const existeVirtual = await this.centroRepository.findOne({
      where: { negocioId, es_virtual: true, fecha_baja: IsNull() },
    });
    
    if (existeVirtual && existeVirtual.id !== id) {
      throw new BadRequestException('Este negocio ya tiene un centro virtual. Solo se permite uno.');
    }
  }

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
    const whatsappE164 = this.validarWhatsApp(
      createCentroDto.country_code,
      createCentroDto.national_number
    );

    await this.verificarCentroVirtualUnico(createCentroDto.negocioId, createCentroDto.es_virtual);

    // ===== VALIDACIONES SEGÚN TIPO DE CENTRO =====
    let timezone: string;
    
    if (createCentroDto.es_virtual) {
      // Centro virtual: hereda timezone del negocio (o usa el enviado)
      if (createCentroDto.timezone) {
        timezone = createCentroDto.timezone;
        console.log(`Centro virtual con timezone especificado: ${timezone}`);
      } else {
        timezone = await this.obtenerTimezoneDesdeNegocio(createCentroDto.negocioId);
        console.log(`Centro virtual creado con timezone heredado: ${timezone}`);
      }
    } else {
      // Centro físico: requiere domicilio y obtiene timezone de coordenadas
      if (!createCentroDto.domicilio || !createCentroDto.domicilio.formatted_address) {
        throw new BadRequestException('El domicilio es obligatorio para centros físicos');
      }
      this.validarDireccion(createCentroDto.domicilio);
      
      timezone = await this.obtenerTimezoneDesdeCoordenadas(
        createCentroDto.domicilio.latitude,
        createCentroDto.domicilio.longitude
      );
    }

    const codigo = await this.generarCodigoUnico(createCentroDto.negocioId);

    // Crear nuevo objeto Centro directamente
    const nuevoCentro = new Centro();
    nuevoCentro.negocioId = createCentroDto.negocioId;
    nuevoCentro.nombre = createCentroDto.nombre.toUpperCase();
    nuevoCentro.codigo = codigo;
    nuevoCentro.es_virtual = createCentroDto.es_virtual || false;
    nuevoCentro.country_code = createCentroDto.country_code;
    nuevoCentro.national_number = createCentroDto.national_number;
    nuevoCentro.whatsapp_e164 = whatsappE164;
    nuevoCentro.timezone = timezone;  // 🔹 GUARDAR TIMEZONE
    nuevoCentro.usuario_alta = usuario || 'demo';

    if (!createCentroDto.es_virtual && createCentroDto.domicilio) {
      nuevoCentro.street = createCentroDto.domicilio.street;
      nuevoCentro.street_number = createCentroDto.domicilio.street_number;
      nuevoCentro.postal_code = createCentroDto.domicilio.postal_code;
      nuevoCentro.city = createCentroDto.domicilio.city;
      nuevoCentro.state = createCentroDto.domicilio.state;
      nuevoCentro.country = createCentroDto.domicilio.country;
      nuevoCentro.country_code_iso = createCentroDto.domicilio.country_code;
      nuevoCentro.latitude = createCentroDto.domicilio.latitude;
      nuevoCentro.longitude = createCentroDto.domicilio.longitude;
      nuevoCentro.formatted_address = createCentroDto.domicilio.formatted_address;
    }

    return await this.centroRepository.save(nuevoCentro);
  }

  async update(id: number, updateCentroDto: UpdateCentroDto, usuario?: string): Promise<Centro> {
    const centroExistente = await this.findOne(id);

    if (updateCentroDto.country_code || updateCentroDto.national_number) {
      const country_code = updateCentroDto.country_code ?? centroExistente.country_code;
      const national_number = updateCentroDto.national_number ?? centroExistente.national_number;
      
      const whatsappE164 = this.validarWhatsApp(country_code, national_number);
      centroExistente.whatsapp_e164 = whatsappE164;
    }

    if (updateCentroDto.es_virtual !== undefined) {
      await this.verificarCentroVirtualUnico(centroExistente.negocioId, updateCentroDto.es_virtual, id);
    }

    // ===== ACTUALIZAR TIMEZONE SEGÚN EL CASO =====
    if (updateCentroDto.domicilio) {
      // Si se actualiza domicilio, recalcular timezone
      this.validarDireccion(updateCentroDto.domicilio);
      
      const nuevoTimezone = await this.obtenerTimezoneDesdeCoordenadas(
        updateCentroDto.domicilio.latitude,
        updateCentroDto.domicilio.longitude
      );
      centroExistente.timezone = nuevoTimezone;
      
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
    } else if (updateCentroDto.es_virtual === true && !updateCentroDto.domicilio) {
      // Si se convierte a virtual y no hay domicilio, heredar timezone del negocio
      const timezoneNegocio = await this.obtenerTimezoneDesdeNegocio(centroExistente.negocioId);
      centroExistente.timezone = timezoneNegocio;
    } else if (updateCentroDto.timezone) {
      // Permitir actualizar timezone directamente (para centros virtuales)
      centroExistente.timezone = updateCentroDto.timezone;
    }

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

    if (updateCentroDto.fecha_baja !== undefined) {
      (centroExistente as any).fecha_baja = updateCentroDto.fecha_baja;
    }
    if (updateCentroDto.usuario_baja !== undefined) {
      (centroExistente as any).usuario_baja = updateCentroDto.usuario_baja;
    }

    centroExistente.usuario_modificacion = usuario || 'demo';

    return await this.centroRepository.save(centroExistente);
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
