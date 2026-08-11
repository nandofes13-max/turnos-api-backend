// src/common/utils/phone-utils.ts

/**
 * Normaliza un número de teléfono al formato E.164
 * - Elimina el signo +
 * - Asegura que el código de país esté presente
 * - Para Argentina (54), asegura que tenga el 9 después del 54
 * - Elimina espacios, guiones, paréntesis, etc.
 * 
 * @param phone - Número de teléfono a normalizar
 * @returns Número normalizado en formato E.164 (ej: 5491163658602)
 * @throws Error si el número es inválido
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) {
    throw new Error('Número de teléfono vacío');
  }

  // 1. Eliminar espacios, guiones, paréntesis, etc.
  let cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
  
  // 2. Eliminar el signo + si existe
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }
  
  // 3. Si el número comienza con 00, reemplazar por +
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  }
  
  // 4. Si el número tiene menos de 10 dígitos, es inválido
  if (cleaned.length < 10) {
    throw new Error('Número de teléfono inválido (menos de 10 dígitos)');
  }
  
  // 5. Si el número comienza con 0, asumir Argentina (54)
  if (cleaned.startsWith('0')) {
    cleaned = '54' + cleaned.substring(1);
  }
  
  // 6. Si el número tiene 10 dígitos y comienza con 9, agregar código de país Argentina
  if (cleaned.length === 10 && cleaned.startsWith('9')) {
    cleaned = '54' + cleaned;
  }
  
  // 7. Si el número tiene 11 dígitos y comienza con 9, agregar código de país Argentina
  if (cleaned.length === 11 && cleaned.startsWith('9')) {
    cleaned = '54' + cleaned;
  }
  
  // 8. Si el número tiene 12 dígitos y comienza con 54, es Argentina
  if (cleaned.length === 12 && cleaned.startsWith('54')) {
    // Verificar si tiene el 9 después del 54
    if (cleaned[2] !== '9') {
      // Insertar 9 después del 54
      cleaned = cleaned.substring(0, 2) + '9' + cleaned.substring(2);
    }
  }
  
  // 9. Si el número tiene 13 dígitos y comienza con 54, es Argentina
  if (cleaned.length === 13 && cleaned.startsWith('54')) {
    // Verificar si tiene el 9 después del 54
    if (cleaned[2] !== '9') {
      // Insertar 9 después del 54
      cleaned = cleaned.substring(0, 2) + '9' + cleaned.substring(2);
    }
  }
  
  // 10. Si el número tiene 11 dígitos y comienza con 54, es Argentina
  if (cleaned.length === 11 && cleaned.startsWith('54')) {
    // Verificar si tiene el 9 después del 54
    if (cleaned[2] !== '9') {
      // Insertar 9 después del 54
      cleaned = cleaned.substring(0, 2) + '9' + cleaned.substring(2);
    }
  }
  
  return cleaned;
}
