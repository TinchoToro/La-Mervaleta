import { useEffect, useState, useCallback, useRef } from 'react';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
export function useDesafios(habilitado = true) {
  const [desafios, setDesafios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const ocupado = useRef(false);
  const cargar = useCallback(async () => {
    if (!habilitado || ocupado.current) return;
    ocupado.current = true;
    try {
      const token = localStorage.getItem('mervaleta_token');
      const res = await fetch(`${API}/desafios`, { cache: 'no-store', headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data)) throw new Error(data.error || 'No se pudo actualizar el progreso');
      setDesafios(data);
      setError('');
    } catch (err) { setError(err.message || 'No se pudo conectar. Volvé a intentar.'); }
    finally { ocupado.current = false; setLoading(false); }
  }, [habilitado]);
  useEffect(() => {
    if (!habilitado) return;
    cargar();
    const actualizar = () => { if (document.visibilityState === 'visible') cargar(); };
    const intervalo = setInterval(actualizar, 15000);
    window.addEventListener('focus', actualizar);
    window.addEventListener('mervaleta:actividad', actualizar);
    document.addEventListener('visibilitychange', actualizar);
    return () => {
      clearInterval(intervalo);
      window.removeEventListener('focus', actualizar);
      window.removeEventListener('mervaleta:actividad', actualizar);
      document.removeEventListener('visibilitychange', actualizar);
    };
  }, [habilitado, cargar]);
  const completados = desafios.filter(d => d.completado).length;
  const puntos = desafios.reduce((s, d) => s + (d.completado ? Number(d.puntos_otorgados || 0) : 0), 0);
  return { desafios, loading, error, cargar, completados, puntos,
    porcentaje: desafios.length ? Math.round(completados / desafios.length * 100) : 0 };
}
