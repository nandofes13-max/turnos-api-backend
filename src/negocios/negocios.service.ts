// src/negocios/negocios.service.ts
import { Injectable, NotFoundException, BadRequestException, forwardRef, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Negocio } from './entities/negocio.entity';
import { CreateNegocioDto } from './dto/create-negocio.dto';
import { UpdateNegocioDto } from './dto/update-negocio.dto';
import { parsePhoneNumber } from 'libphonenumber-js';
import { CentroService } from '../centro/centro.service';

@Injectable()
export class NegociosService {
  constructor(
    @InjectRepository(Negocio)
    private readonly negociosRepository: Repository<Negocio>,
    @Inject(forwardRef(() => CentroService))
    private readonly centroService: CentroService,
  ) {}

  // ===== OBTENER TIMEZONE DESDE COORDENADAS (TimezoneDB) =====
  private async obtenerTimezoneDesdeCoordenadas(lat: number, lng: number): Promise<string> {
    const API_KEY = 'DAPTMA97YA6B';  // Tu API key de TimezoneDB
    
    try {
      const url = `https://api.timezonedb.com/v2.1/get-time-zone?key=${API_KEY}&format=json&by=position&lat=${lat}&lng=${lng}`;
      console.log(`Consultando timezone para lat: ${lat}, lng: ${lng}`);
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'OK' && data.zoneName) {
        console.log(`✅ Timezone obtenido: ${data.zoneName}`);
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

  // ===== VALIDACIÓN DE WHATSAPP CON LIBPHONENUMBER =====
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
  private validarDireccion(domicilio: any) {
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

  async findAll(): Promise<Negocio[]> {
    return this.negociosRepository.find();
  }

  async findOne(id: number): Promise<Negocio> {
    const negocio = await this.negociosRepository.findOneBy({ id });

    if (!negocio) {
      throw new NotFoundException(`Negocio con id ${id} no encontrado`);
    }

    return negocio;
  }

  async findByUrl(url: string): Promise<Negocio | null> {
    return this.negociosRepository.findOneBy({ 
      url,
      fecha_baja: IsNull() 
    });
  }

  async create(createNegocioDto: CreateNegocioDto, usuario?: string): Promise<Negocio> {
    const whatsappE164 = this.validarWhatsApp(
      createNegocioDto.country_code,
      createNegocioDto.national_number
    );

    this.validarDireccion(createNegocioDto.domicilio);

    const timezone = await this.obtenerTimezoneDesdeCoordenadas(
      createNegocioDto.domicilio.latitude,
      createNegocioDto.domicilio.longitude
    );

    const url = await this.generarUrlUnica(createNegocioDto.nombre);

    const negocioEntity = this.negociosRepository.create({
      nombre: createNegocioDto.nombre.toUpperCase(),
      country_code: createNegocioDto.country_code,
      national_number: createNegocioDto.national_number,
      whatsapp_e164: whatsappE164,
      url,
      street: createNegocioDto.domicilio.street,
      street_number: createNegocioDto.domicilio.street_number,
      postal_code: createNegocioDto.domicilio.postal_code,
      city: createNegocioDto.domicilio.city,
      state: createNegocioDto.domicilio.state,
      country: createNegocioDto.domicilio.country,
      country_code_iso: createNegocioDto.domicilio.country_code,
      latitude: createNegocioDto.domicilio.latitude,
      longitude: createNegocioDto.domicilio.longitude,
      formatted_address: createNegocioDto.domicilio.formatted_address,
      timezone: timezone,
      usuario_alta: usuario || 'demo',
    });

    return this.negociosRepository.save(negocioEntity);
  }

  async update(id: number, updateNegocioDto: UpdateNegocioDto, usuario?: string): Promise<Negocio> {
    const negocioExistente = await this.findOne(id);

    if (updateNegocioDto.country_code || updateNegocioDto.national_number) {
      const country_code = updateNegocioDto.country_code ?? negocioExistente.country_code;
      const national_number = updateNegocioDto.national_number ?? negocioExistente.national_number;
      
      const whatsappE164 = this.validarWhatsApp(country_code, national_number);
      negocioExistente.whatsapp_e164 = whatsappE164;
    }

    if (updateNegocioDto.domicilio) {
      this.validarDireccion(updateNegocioDto.domicilio);
      
      const nuevoTimezone = await this.obtenerTimezoneDesdeCoordenadas(
        updateNegocioDto.domicilio.latitude,
        updateNegocioDto.domicilio.longitude
      );
      negocioExistente.timezone = nuevoTimezone;
      
      negocioExistente.street = updateNegocioDto.domicilio.street;
      negocioExistente.street_number = updateNegocioDto.domicilio.street_number;
      negocioExistente.postal_code = updateNegocioDto.domicilio.postal_code;
      negocioExistente.city = updateNegocioDto.domicilio.city;
      negocioExistente.state = updateNegocioDto.domicilio.state;
      negocioExistente.country = updateNegocioDto.domicilio.country;
      negocioExistente.country_code_iso = updateNegocioDto.domicilio.country_code;
      negocioExistente.latitude = updateNegocioDto.domicilio.latitude;
      negocioExistente.longitude = updateNegocioDto.domicilio.longitude;
      negocioExistente.formatted_address = updateNegocioDto.domicilio.formatted_address;
    }

    if (updateNegocioDto.nombre) {
      negocioExistente.nombre = updateNegocioDto.nombre.toUpperCase();
    }
    if (updateNegocioDto.country_code) {
      negocioExistente.country_code = updateNegocioDto.country_code;
    }
    if (updateNegocioDto.national_number) {
      negocioExistente.national_number = updateNegocioDto.national_number;
    }

    if (updateNegocioDto.fecha_baja === null) {
      (negocioExistente as any).fecha_baja = null;
      (negocioExistente as any).usuario_baja = null;
    } else {
      Object.assign(negocioExistente, updateNegocioDto);
    }

    negocioExistente.usuario_modificacion = usuario || 'demo';

    return this.negociosRepository.save(negocioExistente);
  }

  // ============================================================
  // MÉTODO softDelete MODIFICADO: Desactiva en cascada centros, relaciones y agendas
  // ============================================================
  async softDelete(id: number, usuario?: string): Promise<void> {
    const negocioExistente = await this.findOne(id);
    
    // 🔹 1. Buscar todos los centros activos de este negocio
    const centros = await this.centroService.findByNegocio(id);
    console.log(`[Negocio.softDelete] Desactivando ${centros.length} centros del negocio ${negocioExistente.nombre}`);
    
    // 🔹 2. Desactivar cada centro (esto activará su propia cascada)
    for (const centro of centros) {
      if (!centro.fecha_baja) {
        await this.centroService.softDelete(centro.id, usuario);
      }
    }
    
    // 🔹 3. Desactivar el negocio
    negocioExistente.fecha_baja = new Date();
    negocioExistente.usuario_baja = usuario || 'demo';
    
    await this.negociosRepository.save(negocioExistente);
    console.log(`[Negocio.softDelete] Negocio ${negocioExistente.nombre} desactivado correctamente`);
  }

  async debugStructure(): Promise<any> {
    return this.negociosRepository.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'negocio'
         OR table_name = 'negocios';
    `);
  }
}
