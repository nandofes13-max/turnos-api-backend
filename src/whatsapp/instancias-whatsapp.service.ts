// src/whatsapp/instancias-whatsapp.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import axios from 'axios';
import { InstanciaWhatsapp } from './entities/instancia-whatsapp.entity';
import { CreateInstanciaWhatsappDto } from './dto/create-instancia-whatsapp.dto';
import { WhatsappConfig } from './entities/whatsapp-config.entity';

@Injectable()
export class InstanciasWhatsappService {
  private readonly API_BASE_URL = 'https://api.green-api.com';

  constructor(
    @InjectRepository(InstanciaWhatsapp)
    private readonly repository: Repository<InstanciaWhatsapp>,
    @InjectRepository(WhatsappConfig)
    private readonly configRepository: Repository<WhatsappConfig>,
  ) {}

  /**
   * Obtiene el número de WhatsApp de una instancia de GREEN API
   * Usa getWaSettings que devuelve el campo "phone"
   * @throws Error si no se puede obtener el número
   */
  private async obtenerNumeroWhatsApp(instanceId: string, apiToken: string): Promise<string> {
    try {
      const url = `${this.API_BASE_URL}/waInstance${instanceId}/getWaSettings/${apiToken}`;
      console.log(`[InstanciasService] Consultando getWaSettings para instancia ${instanceId}`);
      
      const response = await axios.get(url);
      console.log(`[InstanciasService] Respuesta de getWaSettings:`, JSON.stringify(response.data, null, 2));
      
      if (response.data && response.data.phone) {
        console.log(`[InstanciasService] Número obtenido: ${response.data.phone}`);
        return response.data.phone;
      }
      
      throw new Error('No se pudo obtener el número de teléfono de GREEN API');
    } catch (error) {
      console.error('[InstanciasService] Error obteniendo número de GREEN API:', error.message);
      throw new Error(`Error al validar credenciales: ${error.message}`);
    }
  }

  /**
   * Valida las credenciales de GREEN API
   * @throws Error si las credenciales no son válidas
   */
  private async validarCredenciales(instanceId: string, apiToken: string): Promise<void> {
    try {
      const url = `${this.API_BASE_URL}/waInstance${instanceId}/getStateInstance/${apiToken}`;
      const response = await axios.get(url);
      
      const stateInstance = response.data?.stateInstance;
      const esValido = stateInstance === 'authorized' || stateInstance === 'online';
      
      if (!esValido) {
        throw new Error(`Estado de instancia inválido: ${stateInstance}`);
      }
      
      console.log(`[InstanciasService] Credenciales validadas correctamente. Estado: ${stateInstance}`);
    } catch (error) {
      console.error('[InstanciasService] Error validando credenciales:', error.message);
      throw new Error(`Credenciales inválidas: ${error.message}`);
    }
  }

  /**
   * Crea una nueva instancia de GREEN API
   * - Valida las credenciales
   * - Obtiene el número de WhatsApp automáticamente
   * - Guarda la instancia con estado 'disponible'
   */
  async create(createDto: CreateInstanciaWhatsappDto, usuario: string): Promise<InstanciaWhatsapp> {
    // 1. Validar credenciales con GREEN API
    await this.validarCredenciales(createDto.instanceId, createDto.apiToken);
    
    // 2. Obtener el número de WhatsApp automáticamente
    const numeroWhatsapp = await this.obtenerNumeroWhatsApp(createDto.instanceId, createDto.apiToken);
    
    // 3. Crear la instancia
    const nuevaInstancia = this.repository.create({
      instanceId: createDto.instanceId,
      apiToken: createDto.apiToken,
      numeroWhatsapp: numeroWhatsapp,
      negociosActivos: 0,
      estado: 'disponible',
      usuario_alta: usuario,
      fecha_alta: new Date(),
    });
    
    const instanciaGuardada = await this.repository.save(nuevaInstancia);
    console.log(`[InstanciasService] Instancia creada: ID ${instanciaGuardada.id}, Número: ${numeroWhatsapp}`);
    
    return instanciaGuardada;
  }

  /**
   * Lista todas las instancias (activas e inactivas)
   */
  async findAll(): Promise<InstanciaWhatsapp[]> {
    return this.repository.find({
      order: { id: 'ASC' },
    });
  }

  /**
   * Lista solo las instancias activas (disponibles)
   */
  async findActivas(): Promise<InstanciaWhatsapp[]> {
    return this.repository.find({
      where: { fecha_baja: IsNull() },
      order: { id: 'ASC' },
    });
  }

  /**
   * Busca una instancia disponible para asignar un nuevo negocio
   * - Solo instancias activas (sin fecha_baja)
   * - Con estado 'disponible' (negocios_activos < 3)
   */
  async findDisponible(): Promise<InstanciaWhatsapp | null> {
    return this.repository.findOne({
      where: {
        estado: 'disponible',
        fecha_baja: IsNull(),
      },
      order: { id: 'ASC' },
    });
  }

  /**
   * Obtiene una instancia por ID
   */
  async findOne(id: number): Promise<InstanciaWhatsapp> {
    const instancia = await this.repository.findOne({
      where: { id },
    });

    if (!instancia) {
      throw new NotFoundException(`Instancia con ID ${id} no encontrada`);
    }

    return instancia;
  }

  /**
   * Actualiza una instancia
   * - Permite actualizar instanceId y apiToken
   * - Vuelve a validar credenciales y obtener el número de WhatsApp
   * - NO permite modificar negocios_activos ni estado manualmente (son automáticos)
   */
  async update(id: number, instanceId: string, apiToken: string, usuario: string): Promise<InstanciaWhatsapp> {
    const instancia = await this.findOne(id);
    
    // Validar que no tenga negocios activos si se va a cambiar el instanceId o apiToken
    if (instancia.negociosActivos > 0) {
      throw new BadRequestException(
        `No se puede modificar la instancia porque tiene ${instancia.negociosActivos} negocios activos.`
      );
    }
    
    // Validar nuevas credenciales con GREEN API
    await this.validarCredenciales(instanceId, apiToken);
    
    // Obtener el número de WhatsApp automáticamente
    const numeroWhatsapp = await this.obtenerNumeroWhatsApp(instanceId, apiToken);
    
    instancia.instanceId = instanceId;
    instancia.apiToken = apiToken;
    instancia.numeroWhatsapp = numeroWhatsapp;
    instancia.usuario_modificacion = usuario;
    instancia.fecha_modificacion = new Date();
    
    const instanciaActualizada = await this.repository.save(instancia);
    console.log(`[InstanciasService] Instancia ID ${id} actualizada. Nuevo número: ${numeroWhatsapp}`);
    
    return instanciaActualizada;
  }

  /**
   * Actualiza el contador de negocios activos y el estado de una instancia
   * Se llama automáticamente cuando se activa o desactiva un negocio
   */
  async actualizarContador(instanciaId: number): Promise<InstanciaWhatsapp> {
    const instancia = await this.findOne(instanciaId);
    
    // Contar negocios activos asignados a esta instancia
    const count = await this.configRepository.count({
      where: {
        instanciaId: instanciaId,
        fecha_baja: IsNull(),
      },
    });
    
    instancia.negociosActivos = count;
    
    // Actualizar estado automáticamente
    const estadoAnterior = instancia.estado;
    instancia.estado = count >= 3 ? 'no disponible' : 'disponible';
    
    // Si se llena, registrar fecha
    if (count >= 3 && !instancia.fechaLlena) {
      instancia.fechaLlena = new Date();
    }
    
    // Si ya no está llena, limpiar fecha
    if (count < 3) {
      instancia.fechaLlena = null;
    }
    
    instancia.fecha_modificacion = new Date();
    
    const instanciaActualizada = await this.repository.save(instancia);
    console.log(`[InstanciasService] Instancia ID ${instanciaId}: negocios=${count}, estado=${instancia.estado} (era ${estadoAnterior})`);
    
    return instanciaActualizada;
  }

  /**
   * Da de baja lógica una instancia
   * Solo permite si no tiene negocios activos
   */
  async softDelete(id: number, usuario: string): Promise<void> {
    const instancia = await this.findOne(id);
    
    // Validar que no tenga negocios activos
    if (instancia.negociosActivos > 0) {
      throw new BadRequestException(
        `No se puede desactivar la instancia porque tiene ${instancia.negociosActivos} negocios activos. ` +
        `Primero desactiva los negocios asociados.`
      );
    }
    
    instancia.fecha_baja = new Date();
    instancia.usuario_baja = usuario;
    instancia.fecha_modificacion = new Date();
    instancia.usuario_modificacion = usuario;
    
    await this.repository.save(instancia);
    console.log(`[InstanciasService] Instancia ID ${id} desactivada por ${usuario}`);
  }

  /**
   * Reactiva una instancia previamente desactivada
   * Solo permite si está dada de baja
   */
  async reactivar(id: number, usuario: string): Promise<InstanciaWhatsapp> {
    const instancia = await this.findOne(id);
    
    if (!instancia.fecha_baja) {
      throw new BadRequestException('La instancia ya está activa');
    }
    
    instancia.fecha_baja = null as any;
    instancia.usuario_baja = null as any;
    instancia.usuario_modificacion = usuario;
    instancia.fecha_modificacion = new Date();
    
    const instanciaActualizada = await this.repository.save(instancia);
    console.log(`[InstanciasService] Instancia ID ${id} reactivada por ${usuario}`);
    
    return instanciaActualizada;
  }
}
