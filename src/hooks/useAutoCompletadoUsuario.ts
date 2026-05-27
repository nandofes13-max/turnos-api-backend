import { useState, useEffect, useRef } from 'react';

interface UsuarioData {
  id: number;
  email: string;
  nombre: string;
  apellido: string;
  telefono: string;
}

interface UseAutoCompletadoUsuarioReturn {
  buscando: boolean;
  usuarioData: UsuarioData | null;
  error: string | null;
  buscarPorEmail: (email: string) => void;
  upsertUsuario: (data: { email: string; nombre: string; apellido: string; telefono: string }) => Promise<UsuarioData | null>;
  limpiar: () => void;
}

const API_BASE_URL = import.meta.env.VITE_API_URL;

const validarEmail = (email: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

export const useAutoCompletadoUsuario = (): UseAutoCompletadoUsuarioReturn => {
  const [buscando, setBuscando] = useState(false);
  const [usuarioData, setUsuarioData] = useState<UsuarioData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const emailActualRef = useRef<string>('');

  const buscarPorEmail = (email: string) => {
    // Limpiar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    emailActualRef.current = email;

    // Si el email es inválido o está vacío, limpiar datos
    if (!email || !validarEmail(email)) {
      setUsuarioData(null);
      setError(null);
      setBuscando(false);
      return;
    }

    // Debounce: esperar 500ms antes de buscar
    timeoutRef.current = setTimeout(async () => {
      setBuscando(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE_URL}/usuarios/email/${encodeURIComponent(email)}`);
        const data = await response.json();

        // Verificar que el email no haya cambiado mientras se hacía la petición
        if (emailActualRef.current !== email) {
          return;
        }

        if (response.ok && data.id) {
          setUsuarioData({
            id: data.id,
            email: data.email,
            nombre: data.nombre || '',
            apellido: data.apellido || '',
            telefono: data.telefono || '',
          });
          setError(null);
        } else {
          setUsuarioData(null);
          setError(null);
        }
      } catch (err) {
        console.error('Error al buscar usuario:', err);
        setUsuarioData(null);
        setError('Error al conectar con el servidor');
      } finally {
        setBuscando(false);
      }
    }, 500);
  };

  const upsertUsuario = async (data: { email: string; nombre: string; apellido: string; telefono: string }): Promise<UsuarioData | null> => {
    setBuscando(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/usuarios/upsert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Error al guardar el usuario');
      }

      const usuarioDataResult: UsuarioData = {
        id: result.id,
        email: result.email,
        nombre: result.nombre || '',
        apellido: result.apellido || '',
        telefono: result.telefono || '',
      };

      setUsuarioData(usuarioDataResult);
      return usuarioDataResult;
    } catch (err: any) {
      console.error('Error al upsert usuario:', err);
      setError(err.message || 'Error al guardar el usuario');
      return null;
    } finally {
      setBuscando(false);
    }
  };

  const limpiar = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setUsuarioData(null);
    setError(null);
    setBuscando(false);
    emailActualRef.current = '';
  };

  // Limpiar timeout al desmontar
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    buscando,
    usuarioData,
    error,
    buscarPorEmail,
    upsertUsuario,
    limpiar,
  };
};
