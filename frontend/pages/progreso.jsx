// pages/progreso.jsx – Trazabilidad educativa del alumno
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const NIVEL_CONFIG = {
  basico:     { color: '#34d399', bg: 'rgba(52,211,153,0.1)',  label: 'Básico',     emoji: '🟢' },
  intermedio: { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  label: 'Intermedio', emoji: '🟡' },
  avanzado:   { color: '#f87171', bg: 'rgba(248,113,113,0.1)', label: 'Avanzado',   emoji: '🔴' },
};

export default function Progreso() {
  const router = useRouter();
  const { usuario, cargando } = useAuth();
  const [datos, setDatos]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cargando && !usuario) { router.push('/login'); return; }
    if (!usuario) return;
    const token = localStorage.getItem('mervaleta_token');
    fetch(`${API}/trazabilidad/mi-progreso`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setDatos(d))
      .finally(() => setLoading(false));
  }, [usuario, cargando]);

  if (cargando || loading) return <Spinner />;
  if (!datos) return null;

  const nivelCfg = NIVEL_CONFIG[datos.nivel_alcanzado] || NIVEL_CONFIG.basico;
  const pctGeneral = datos.total_leidos > 0 ?
    Math.round((datos.total_leidos / Object.values(datos?.totales_por_nivel || {}).reduce((s, n) => s + n.total, 0)) * 100) : 0;

  return (
    <div style={{ minHeight: '100vh', background: '#0b1120', fontFamily: 'system-ui,-apple-system,sans-serif', color: '#e2e8f0' }}>

      <nav style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/conceptos" style={{ color: '#475569', textDecoration: 'none', fontSize: 18 }}>←</Link>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#7c3aed,#0284c7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>📈</div>
        <span style={{ fontWeight: 800, fontSize: 15 }}>Mi Progreso Educativo</span>
      </nav>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Nivel alcanzado */}
        <div style={{ background: `linear-gradient(135deg,${nivelCfg.bg},rgba(0,0,0,0.2))`, border: `1px solid ${nivelCfg.color}40`, borderRadius: 18, padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>{nivelCfg.emoji}</div>
          <div style={{ fontSize: 12, color: nivelCfg.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>Nivel alcanzado</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: '#f1f5f9', marginBottom: 8 }}>Inversor {nivelCfg.label}</div>
          <div style={{ height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 4, maxWidth: 300, margin: '0 auto' }}>
            <div style={{ height: '100%', width: `${pctGeneral}%`, background: nivelCfg.color, borderRadius: 4 }} />
          </div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 8 }}>{datos.total_leidos} conceptos leídos · {pctGeneral}% completado</div>
        </div>

        {/* Stats rápidas */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10 }}>
          {[
            { label: 'Conceptos leídos', valor: datos.total_leidos, color: '#60a5fa' },
            { label: 'Tiempo de lectura', valor: `${datos.tiempo_total_minutos} min`, color: '#34d399' },
            { label: 'Racha actual', valor: `${datos.racha_dias} días`, color: '#fbbf24' },
            { label: 'Operaciones', valor: datos?.correlacion_operaciones?.length || 0, color: '#c084fc' },
          ].map(s => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '14px 16px' }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: s.color }}>{s.valor}</div>
              <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Progreso por nivel */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>📚 Progreso por nivel</div>
          {['basico','intermedio','avanzado'].map(nivel => {
            const cfg = NIVEL_CONFIG[nivel];
            const info = datos?.totales_por_nivel?.[nivel] || { leidos: 0, total: 0 };
            const pct = info.total > 0 ? Math.round((info.leidos / info.total) * 100) : 0;
            return (
              <div key={nivel} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14 }}>{cfg.emoji}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
                  </div>
                  <span style={{ fontSize: 12, color: '#64748b' }}>{info.leidos}/{info.total} conceptos</span>
                </div>
                <div style={{ height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 4 }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: cfg.color, borderRadius: 4, transition: 'width .5s' }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Correlación lectura vs operaciones */}
        {datos?.correlacion_operaciones?.length || 0 > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>🔗 Correlación educativa</div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
              Cuántos conceptos habías leído cuando realizaste cada operación
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {datos?.correlacion_operaciones?.slice(-8).map((op, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                  <span style={{ fontSize: 12, color: op.tipo === 'compra' ? '#34d399' : '#f87171', fontWeight: 700, width: 50 }}>
                    {op.tipo === 'compra' ? '▲' : '▼'} {op.tipo_activo}
                  </span>
                  <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 4 }}>
                    <div style={{ height: '100%', width: `${Math.min((op.conceptos_al_momento / 20) * 100, 100)}%`, background: '#7c3aed', borderRadius: 4 }} />
                  </div>
                  <span style={{ fontSize: 11, color: '#475569', width: 80, textAlign: 'right' }}>
                    {op.conceptos_al_momento} conceptos leídos
                  </span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(124,58,237,0.08)', borderRadius: 10, border: '1px solid rgba(124,58,237,0.2)' }}>
              <div style={{ fontSize: 12, color: '#a78bfa' }}>
                💡 Los inversores que leen más conceptos antes de operar tienden a tomar mejores decisiones.
                {datos.total_leidos >= 10 ? ' ¡Vas muy bien!' : ' Seguí leyendo antes de operar.'}
              </div>
            </div>
          </div>
        )}

        {/* Conceptos leídos recientemente */}
        {(datos?.conceptos_vistos?.length || 0) > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700 }}>📖 Últimos conceptos leídos</span>
              <Link href="/conceptos" style={{ fontSize: 12, color: '#0284c7', textDecoration: 'none' }}>Ver todos →</Link>
            </div>
            {datos?.conceptos_vistos?.slice(-6).reverse().map((c, i) => {
              const cfg = NIVEL_CONFIG[c.nivel] || NIVEL_CONFIG.basico;
              return (
                <div key={i} style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 14 }}>{cfg.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{c.titulo}</div>
                    <div style={{ fontSize: 11, color: '#475569' }}>
                      {c.veces_leido > 1 ? `Leído ${c.veces_leido} veces` : 'Leído 1 vez'}
                      {c.tiempo_lectura > 0 ? ` · ${Math.round(c.tiempo_lectura / 60)} min` : ''}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: cfg.bg, color: cfg.color, fontWeight: 700 }}>{cfg.label}</span>
                </div>
              );
            })}
          </div>
        )}

        <Link href="/conceptos" style={{ textDecoration: 'none' }}>
          <div style={{ background: 'linear-gradient(135deg,#7c3aed,#0284c7)', borderRadius: 14, padding: '14px', textAlign: 'center', fontWeight: 800, fontSize: 14, color: '#fff', cursor: 'pointer' }}>
            Seguir aprendiendo →
          </div>
        </Link>
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
