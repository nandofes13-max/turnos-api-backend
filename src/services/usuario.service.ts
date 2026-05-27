const API_BASE_URL = import.meta.env.VITE_API_URL;

export interface UsuarioData {
  id?: number;
  email: string;
  nombre: string;
  apellido: string;
  telefono: string;
}

export const usuarioService = {
  // Buscar usuario por email
  buscarPorEmail: async (email: string): Promise<UsuarioData | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/usuarios/email/${encodeURIComponent(email)}`);
      const data = await response.json();
      if (response.ok && data.id) {
        return {
          id: data.id,
          email: data.email,
          nombre: data.nombre || '',
          apellido: data.apellido || '',
          telefono: data.telefono || '',
        };
      }
      return null;
    } catch (error) {
      console.error('Error al buscar usuario:', error);
      return null;
    }
  },

  // Crear o actualizar usuario
  upsert: async (usuario: UsuarioData): Promise<UsuarioData | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/usuarios/upsert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(usuario),
      });
      const data = await response.json();
      if (response.ok) {
        return {
          id: data.id,
          email: data.email,
          nombre: data.nombre || '',
          apellido: data.apellido || '',
          telefono: data.telefono || '',
        };
      }
      return null;
    } catch (error) {
      console.error('Error al guardar usuario:', error);
      return null;
    }
  },
};
