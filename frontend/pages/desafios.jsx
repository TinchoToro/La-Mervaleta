// pages/desafios.jsx – Desafíos con validación automática
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function Desafios() {
  const router = useRouter();
  const { usuario, cargando } = useAuth();
  const [desafios, setDesafios] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!cargando && !usuario) { router.push('/login'); return; }
    if (!usuario) return;
    cargar();
  }, [usuario, cargando]);

  const cargar = async () => {
    setLoading(true);
    const token = localStorage.getItem('mervaleta_token');
    const res = await fetch(`${API}/desafios`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setDesafios(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  if (cargando || loading) return <Spinner />;

  const completados = desafios.filter(d => d.completado).length;
  const puntosTotal = desafios.filter(d => d.completado).reduce((sum, d) => sum + (d.puntos_bonus || 0), 0);

  return (
    <div style={{ minHeight: '100vh', background: '#0b1120', fontFamily: 'system-ui,-apple-system,sans-serif', color: '#e2e8f0' }}>

      <nav style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/dashboard" style={{ color: '#475569', textDecoration: 'none', fontSize: 18 }}>←</Link>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#f59e0b,#ef4444)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🎯</div>
        <span style={{ fontWeight: 800, fontSize: 15 }}>Mis Desafíos</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, fontSize: 12 }}>
          <span style={{ color: '#34d399', fontWeight: 700 }}>{completados}/{desafios.length} completados</span>
          <span style={{ color: '#fbbf24', fontWeight: 700 }}>+{puntosTotal} pts</span>
        </div>
      </nav>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {desafios.length === 0 ? (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '48px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎯</div>
            <p style={{ color: '#475569' }}>No hay desafíos activos en este momento.</p>
            <p style={{ fontSize: 12, color: '#334155' }}>Tu docente puede asignarlos desde el panel de docente.</p>
          </div>
        ) : desafios.map(d => {
          const pct = d.progreso_objetivo > 0 ? Math.min(Math.round((d.progreso_actual / d.progreso_objetivo) * 100), 100) : 0;
          const diasRestantes = Math.ceil((new Date(d.fecha_fin) - new Date()) / (1000 * 60 * 60 * 24));
          return (
            <div key={d.id} style={{ background: d.completado ? 'rgba(52,211,153,0.06)' : 'rgba(255,255,255,0.04)', border: `1px solid ${d.completado ? 'rgba(52,211,153,0.25)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 16, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 18 }}>{d.completado ? '✅' : '🎯'}</span>
                    <span style={{ fontWeight: 800, fontSize: 15, color: d.completado ? '#34d399' : '#f1f5f9' }}>{d.nombre}</span>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'rgba(251,191,36,0.1)', color: '#fbbf24', fontWeight: 700 }}>+{d.puntos_bonus} pts</span>
                  </div>
                  <p style={{ fontSize: 13, color: '#64748b', margin: 0, lineHeight: 1.5 }}>{d.descripcion}</p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {d.completado ? (
                    <div style={{ fontSize: 11, color: '#34d399', fontWeight: 700 }}>¡Completado!</div>
                  ) : (
                    <div style={{ fontSize: 11, color: diasRestantes <= 3 ? '#f87171' : '#475569' }}>
                      {diasRestantes > 0 ? `${diasRestantes} días restantes` : 'Vencido'}
                    </div>
                  )}
                </div>
              </div>

              {/* Barra de progreso */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: '#475569' }}>Progreso</span>
                  <span style={{ color: d.completado ? '#34d399' : '#94a3b8', fontWeight: 700 }}>
                    {d.progreso_actual}/{d.progreso_objetivo}
                  </span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 4 }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: d.completado ? '#34d399' : 'linear-gradient(90deg,#0284c7,#7c3aed)', borderRadius: 4, transition: 'width .5s ease' }} />
                </div>
              </div>

              {d.completado && d.fecha_completado && (
                <div style={{ fontSize: 11, color: '#334155' }}>
                  Completado el {new Date(d.fecha_completado).toLocaleDateString('es-AR')}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ minHeight: '100vh', background: '#0b1120', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, border: '3px solid #0284c7', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
