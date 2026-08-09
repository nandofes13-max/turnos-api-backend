// src/whatsapp/interfaces/whatsapp-provider.interface.ts

/**
 * Payload para enviar una notificación de nuevo turno
 * Este objeto es independiente del proveedor (GREEN API, Meta, etc.)
 */
export interface NuevoTurnoWhatsappPayload {
  cliente: string;      // Nombre del cliente
  fecha: string;        // Fecha del turno (formato: YYYY-MM-DD)
  hora: string;         // Hora del turno (formato: HH:MM)
  telefono?: string;    // Teléfono del cliente (opcional)
}

/**
 * Contrato que deben implementar todos los proveedores de WhatsApp
 */
export interface WhatsappProvider {
  /**
   * Envía una notificación de nuevo turno al negocio
   * @param negocioId - ID del negocio (para obtener su configuración)
   * @param payload - Datos del turno a notificar
   * @throws Error si el proveedor no está configurado o hay un error de envío
   */
  enviarNuevoTurno(
    negocioId: number,
    payload: NuevoTurnoWhatsappPayload,
  ): Promise<void>;

  /**
   * Envía un mensaje de prueba para verificar que la configuración funciona
   * @param negocioId - ID del negocio
   * @throws Error si la configuración no es válida
   */
  enviarMensajePrueba(negocioId: number): Promise<void>;

  /**
   * Valida si las credenciales del negocio son correctas
   * @param negocioId - ID del negocio
   * @returns true si las credenciales son válidas y la conexión está autorizada
   */
  validarConexion(negocioId: number): Promise<boolean>;
}
