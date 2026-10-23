import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../hooks/useAuth';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
async function api(path, options = {}) {
  const r = await fetch(`${API}/desafios${path}`, { ...options, headers: {
    'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('mervaleta_token')}`,
  } });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || 'No se pudo completar la solicitud');
  return d;
}
export default function RevisionDesafios() {
  const { usuario, cargando } = useAuth();
  const [filas, setFilas] = useState([]);
  const [evidencia, setEvidencia] = useState({});
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [loading, setLoading] = useState(true);
  const autorizado = ['docente', 'admin'].includes(usuario?.rol);
  const cargar = async () => {
    setLoading(true);
    try { setFilas(await api('/revision')); setError(''); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (autorizado) cargar(); }, [autorizado]);
  const aprobar = async fila => {
    const key = `${fila.id}:${fila.usuario_id}`;
    setOcupado(true);
    try {
      await api(`/${fila.id}/aprobar`, { method: 'POST', body: JSON.stringify({ alumno_id: fila.usuario_id, observacion: evidencia[key] }) });
      setFilas(prev => prev.filter(f => `${f.id}:${f.usuario_id}` !== key));
      setError('');
    } catch (e) { setError(e.message); }
    finally { setOcupado(false); }
  };
  if (cargando) return <p>Cargando…</p>;
  if (!autorizado) return <p>Ingresá con una cuenta docente para revisar desafíos.</p>;
  return <main style={{ minHeight: '100vh', background: '#0b1120', color: '#e2e8f0', padding: 24, fontFamily: 'system-ui' }}>
    <div style={{ maxWidth: 800, margin: 'auto' }}>
      <Link href="/docente" style={{ color: '#34d399' }}>← Panel docente</Link>
      <h1>Revisar desafíos</h1>
      <p>Verificá la consigna y la evidencia antes de acreditar. Las actividades abiertas necesitan tu evaluación.
        Los desafíos vencidos de cartera requieren evidencia del cumplimiento dentro de su plazo.</p>
      <button onClick={cargar} disabled={loading || ocupado}>Actualizar</button>
      {error && <p role="alert" style={{ color: '#f87171' }}>{error}</p>}
      {loading && <p>Cargando revisiones…</p>}
      {!loading && !error && !filas.length && <p>No hay revisiones pendientes.</p>}
      {filas.map(f => {
        const key = `${f.id}:${f.usuario_id}`;
        return <section key={key} style={{ border: '1px solid #334155', borderRadius: 12, padding: 20, marginTop: 16 }}>
          <h2>{f.alumno} · {f.nombre}</h2><p>{f.descripcion}</p>
          <p>+{f.puntos_bonus} puntos · {f.en_plazo ? 'En plazo' : 'Vencido: comprobar evidencia anterior al cierre'}</p>
          {f.error_regla && <p>La regla necesita revisión: {f.error_regla}</p>}
          <label>Evidencia de cumplimiento
            <textarea value={evidencia[key] || ''} onChange={e => setEvidencia(prev => ({ ...prev, [key]: e.target.value }))}
              placeholder="Qué verificaste y cuándo se realizó la actividad" style={{ width: '100%', minHeight: 70, display: 'block', margin: '10px 0', color: '#0b1120' }} />
          </label>
          <button disabled={ocupado || !evidencia[key]?.trim()} onClick={() => aprobar(f)}>Acreditar desafío y puntos</button>
        </section>;
      })}
    </div>
  </main>;
}
