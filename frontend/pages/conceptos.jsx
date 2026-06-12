// pages/conceptos.jsx – Academia estilo dashboard oscuro
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import { conceptosService } from '../services/api';
import Link from 'next/link';

const NIVEL = {
  basico:      { color: '#34d399', bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.25)',  label: 'Básico'      },
  intermedio:  { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.25)',  label: 'Intermedio'  },
  avanzado:    { color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)', label: 'Avanzado'    },
};

export default function Conceptos() {
  const router = useRouter();
  const { usuario, cargando } = useAuth();
  const [conceptos, setConceptos] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [abierto, setAbierto]     = useState(null);
  const [filtro, setFiltro]       = useState('todos');

  useEffect(() => {
    if (!cargando && !usuario) { router.push('/login'); return; }
    if (!usuario) return;
    conceptosService.listar().then(setConceptos).finally(() => setLoading(false));
  }, [usuario, cargando]);

  const marcarVisto = async (id) => {
    try {
      await conceptosService.marcarVisto(id);
      setConceptos(prev => prev.map(c => c.id === id ? { ...c, visto: true } : c));
    } catch {}
  };

  const filtrados = conceptos.filter(c =>
    filtro === 'pendientes' ? !c.visto : filtro === 'vistos' ? c.visto : true
  );

  const leidos = conceptos.filter(c => c.visto).length;
  const pct = conceptos.length > 0 ? Math.round((leidos / conceptos.length) * 100) : 0;

  if (cargando || loading) return <Spinner />;

  return (
    <div style={{ minHeight: '100vh', background: '#0b1120', fontFamily: 'system-ui,-apple-system,sans-serif', color: '#e2e8f0' }}>

      {/* Nav */}
      <nav style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/dashboard" style={{ color: '#475569', textDecoration: 'none', fontSize: 18 }}>←</Link>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#059669,#0284c7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>▦</div>
        <span style={{ fontWeight: 800, fontSize: 15 }}>Academia Mervaleta</span>
<div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
<Link href="/progreso" style={{ fontSize: 12, color: '#c084fc', textDecoration: 'none', fontWeight: 600 }}>📈 Mi progreso</Link>
  <Link href="/glosario" style={{ fontSize: 12, color: '#38bdf8', textDecoration: 'none', fontWeight: 600 }}>📖 Glosario</Link>
  <span style={{ fontSize: 12, color: '#34d399', fontWeight: 700 }}>{leidos}/{conceptos.length} completados</span>
</div>
        
      </nav>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Hero progreso */}
        <div style={{ background: 'linear-gradient(135deg,#0d1b3e,#0a1628)', border: '1px solid rgba(2,132,199,0.3)', borderRadius: 18, padding: '24px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: '50%', background: 'radial-gradient(circle,#0070f3,transparent)', opacity: 0.15 }} />
          <p style={{ fontSize: 10, color: '#0284c7', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700, marginBottom: 8 }}>Tu progreso educativo</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 48, fontWeight: 900, color: '#fff', margin: 0, lineHeight: 1 }}>{pct}%</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>del módulo completado</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 28, fontWeight: 900, color: '#34d399', margin: 0 }}>{leidos}</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>conceptos leídos</p>
            </div>
          </div>
          <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#0284c7,#34d399)', borderRadius: 4, transition: 'width .8s ease' }} />
          </div>
          {pct < 100 && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 8 }}>💡 Leer conceptos desbloquea activos para operar</p>}
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 6 }}>
          {[['todos','Todos'], ['pendientes','Pendientes'], ['vistos','Completados']].map(([val, label]) => (
            <button key={val} onClick={() => setFiltro(val)}
              style={{ padding: '7px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, transition: 'all .15s',
                background: filtro === val ? '#0284c7' : 'rgba(255,255,255,0.06)',
                color: filtro === val ? '#fff' : '#64748b' }}>
              {label}
              {val === 'pendientes' && conceptos.filter(c => !c.visto).length > 0 && (
                <span style={{ marginLeft: 6, background: 'rgba(255,255,255,0.2)', padding: '0 5px', borderRadius: 10 }}>{conceptos.filter(c => !c.visto).length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Lista conceptos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtrados.map(c => {
            const nvl = NIVEL[c.nivel] || NIVEL.basico;
            const isOpen = abierto === c.id;
            return (
              <div key={c.id}
                style={{ background: isOpen ? 'rgba(2,132,199,0.06)' : 'rgba(255,255,255,0.03)', border: `1px solid ${isOpen ? 'rgba(2,132,199,0.3)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 14, overflow: 'hidden', cursor: 'pointer', transition: 'all .2s' }}
                onClick={() => { setAbierto(isOpen ? null : c.id); if (!c.visto) marcarVisto(c.id); }}>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, flexShrink: 0,
                    background: c.visto ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.06)',
                    color: c.visto ? '#34d399' : '#475569',
                    border: `1px solid ${c.visto ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.08)'}` }}>
                    {c.visto ? '✓' : c.orden}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: 14, color: c.visto ? '#64748b' : '#e2e8f0', margin: 0, marginBottom: 4 }}>{c.titulo}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: nvl.bg, color: nvl.color, border: `1px solid ${nvl.border}` }}>
                        {nvl.label}
                      </span>
                      {c.ticker_rel && <span style={{ fontSize: 11, color: '#334155' }}>{c.ticker_rel}</span>}
                    </div>
                  </div>
                  <span style={{ color: '#334155', fontSize: 12, transition: 'transform .2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', flexShrink: 0 }}>▼</span>
                </div>

                {isOpen && (
                  <div style={{ padding: '0 16px 16px' }}>
                    <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '14px 16px' }}>
                      <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.7, margin: 0 }}>{c.contenido}</p>
                    </div>
                    {c.visto && <p style={{ fontSize: 12, color: '#34d399', fontWeight: 600, textAlign: 'center', marginTop: 8, margin: '8px 0 0' }}>✓ Concepto leído</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
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
