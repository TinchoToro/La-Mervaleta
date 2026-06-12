// pages/ranking.jsx – Ranking estilo dashboard oscuro
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import { rankingService } from '../services/api';
import Link from 'next/link';

export default function Ranking() {
  const router = useRouter();
  const { usuario, cargando } = useAuth();
  const [alumnos, setAlumnos]   = useState([]);
  const [escuelas, setEscuelas] = useState([]);
  const [miPos, setMiPos]       = useState(null);
  const [tab, setTab]           = useState('alumnos');
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!cargando && !usuario) { router.push('/login'); return; }
    if (!usuario) return;
    Promise.all([rankingService.alumnos(), rankingService.escuelas(), rankingService.miPosicion().catch(() => null)])
      .then(([a, e, p]) => { setAlumnos(a); setEscuelas(e); setMiPos(p); }).finally(() => setLoading(false));
  }, [usuario, cargando]);

  if (cargando || loading) return <Spinner />;

  const medalla = pos => pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : `#${pos}`;

  return (
    <div style={{ minHeight: '100vh', background: '#0b1120', fontFamily: 'system-ui,-apple-system,sans-serif', color: '#e2e8f0' }}>
      <nav style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/dashboard" style={{ color: '#475569', textDecoration: 'none', fontSize: 18 }}>←</Link>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#059669,#0284c7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>★</div>
        <span style={{ fontWeight: 800, fontSize: 15 }}>Ranking · Liga Escolar</span>
      </nav>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Mi posición */}
        {miPos && (
          <div style={{ background: 'linear-gradient(135deg,#064e3b,#0c4a6e)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: 18, padding: '24px' }}>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Tu posición actual</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 42, fontWeight: 900, color: '#fff', margin: '0 0 4px' }}>{medalla(miPos.posicion)}</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0', margin: 0 }}>{miPos.nombre_completo}</p>
                {miPos.escuela && <p style={{ fontSize: 12, color: '#475569', margin: '2px 0 0' }}>{miPos.escuela}</p>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 32, fontWeight: 900, color: miPos.rendimiento_pct >= 0 ? '#34d399' : '#f87171', margin: 0 }}>
                  {miPos.rendimiento_pct >= 0 ? '+' : ''}{miPos.rendimiento_pct}%
                </p>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: '4px 0 0' }}>
                  ${Number(miPos.capital_actual).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 4 }}>
          {[['alumnos','Alumnos'], ['escuelas','Escuelas']].map(([val, label]) => (
            <button key={val} onClick={() => setTab(val)}
              style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                background: tab === val ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: tab === val ? '#f1f5f9' : '#475569' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Tabla alumnos */}
        {tab === 'alumnos' && (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden' }}>
            {alumnos.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#475569' }}>No hay alumnos en el ranking todavía.</div>
            ) : alumnos.map((a, i) => {
              const esMio = a.id === usuario?.id;
              return (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px',
                  borderBottom: i < alumnos.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  background: esMio ? 'rgba(2,132,199,0.08)' : 'transparent' }}>
                  <div style={{ width: 36, textAlign: 'center', flexShrink: 0, fontSize: a.posicion <= 3 ? 20 : 13, fontWeight: 800, color: a.posicion <= 3 ? undefined : '#334155' }}>
                    {medalla(a.posicion)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: esMio ? '#60a5fa' : '#e2e8f0', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {a.nombre_completo}
                      {esMio && <span style={{ fontSize: 10, background: 'rgba(96,165,250,0.2)', color: '#60a5fa', padding: '1px 6px', borderRadius: 10 }}>vos</span>}
                    </div>
                    {a.escuela && <div style={{ fontSize: 11, color: '#334155' }}>{a.escuela} · {a.ciudad}</div>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 900, color: a.rendimiento_pct >= 0 ? '#34d399' : '#f87171' }}>
                      {a.rendimiento_pct >= 0 ? '+' : ''}{a.rendimiento_pct}%
                    </div>
                    <div style={{ fontSize: 11, color: '#334155' }}>${Number(a.capital_actual).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tabla escuelas */}
        {tab === 'escuelas' && (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden' }}>
            {escuelas.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#475569' }}>No hay datos de escuelas todavía.</div>
            ) : escuelas.map((e, i) => (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: i < escuelas.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <div style={{ width: 36, textAlign: 'center', flexShrink: 0, fontSize: e.posicion <= 3 ? 20 : 13, fontWeight: 800, color: '#334155' }}>
                  {medalla(e.posicion)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#e2e8f0' }}>{e.nombre}</div>
                  <div style={{ fontSize: 11, color: '#334155' }}>{e.ciudad} · {e.total_alumnos} alumnos</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 900, color: e.rendimiento_promedio >= 0 ? '#34d399' : '#f87171' }}>
                    {e.rendimiento_promedio >= 0 ? '+' : ''}{e.rendimiento_promedio}%
                  </div>
                  <div style={{ fontSize: 11, color: '#334155' }}>promedio</div>
                </div>
              </div>
            ))}
          </div>
        )}
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
