import Link from 'next/link';
import { useDesafios } from '../hooks/useDesafios';
export default function ResumenDesafios() {
  const { desafios, loading, error, cargar, completados, puntos, porcentaje } = useDesafios();
  return <section style={{ background: 'rgba(52,211,153,.06)', border: '1px solid rgba(52,211,153,.25)', borderRadius: 16, padding: 20, color: '#e2e8f0' }}>
    <Link href="/desafios" style={{ color: '#34d399', fontWeight: 800 }}>🎯 Mis desafíos</Link>
    {loading ? <p>Actualizando progreso…</p> : <>
      {error && <p role="alert">{error} <button onClick={cargar}>Reintentar</button></p>}
      <p>{completados}/{desafios.length} realizados · <strong>{puntos} puntos acreditados</strong></p>
      <div role="progressbar" aria-label="Desafíos realizados" aria-valuenow={porcentaje} aria-valuemin={0} aria-valuemax={100}
        style={{ height: 8, background: 'rgba(255,255,255,.08)', borderRadius: 4 }}>
        <div style={{ width: `${porcentaje}%`, height: '100%', background: '#34d399', borderRadius: 4 }} />
      </div>
      {desafios.filter(d => d.completado).slice(0, 3).map(d => <p key={d.id} style={{ fontSize: 13 }}>✅ {d.nombre} · +{Number(d.puntos_otorgados || 0)} pts</p>)}
    </>}
  </section>;
}
