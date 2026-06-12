// pages/glosario.jsx – Glosario financiero integrado
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const CATEGORIAS_COLOR = {
  'Instrumentos':     { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',   border: 'rgba(96,165,250,0.2)'   },
  'Mercado':          { color: '#34d399', bg: 'rgba(52,211,153,0.1)',   border: 'rgba(52,211,153,0.2)'   },
  'Conceptos':        { color: '#c084fc', bg: 'rgba(192,132,252,0.1)',  border: 'rgba(192,132,252,0.2)'  },
  'Estrategia':       { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',   border: 'rgba(251,191,36,0.2)'   },
  'Macroeconomia':    { color: '#f87171', bg: 'rgba(248,113,113,0.1)',  border: 'rgba(248,113,113,0.2)'  },
  'Riesgo':           { color: '#fb923c', bg: 'rgba(251,146,60,0.1)',   border: 'rgba(251,146,60,0.2)'   },
  'Analisis':         { color: '#a78bfa', bg: 'rgba(167,139,250,0.1)',  border: 'rgba(167,139,250,0.2)'  },
  'Analisis tecnico': { color: '#38bdf8', bg: 'rgba(56,189,248,0.1)',   border: 'rgba(56,189,248,0.2)'   },
  'General':          { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)',  border: 'rgba(148,163,184,0.2)'  },
};

export default function Glosario() {
  const router = useRouter();
  const { usuario, cargando } = useAuth();
  const [terminos, setTerminos]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [busqueda, setBusqueda]   = useState('');
  const [categoria, setCategoria] = useState('todas');
  const [abierto, setAbierto]     = useState(null);
  const [modalNuevo, setModalNuevo] = useState(false);
  const [form, setForm]           = useState({ termino: '', definicion: '', categoria: 'General', ejemplo: '' });
  const [msg, setMsg]             = useState(null);
  const searchRef = useRef(null);
  const esDocente = usuario?.rol === 'docente' || usuario?.rol === 'admin';

  useEffect(() => {
    if (!cargando && !usuario) { router.push('/login'); return; }
    if (!usuario) return;
    cargar();
  }, [usuario, cargando]);

  // Busqueda con debounce
  useEffect(() => {
    const timer = setTimeout(() => cargar(), 300);
    return () => clearTimeout(timer);
  }, [busqueda, categoria]);

  const cargar = async () => {
    if (!usuario) return;
    setLoading(true);
    const token = localStorage.getItem('mervaleta_token');
    const params = new URLSearchParams();
    if (busqueda) params.append('q', busqueda);
    if (categoria !== 'todas') params.append('categoria', categoria);
    const res = await fetch(`${API}/glosario?${params}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setTerminos(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const crear = async () => {
    if (!form.termino || !form.definicion) { setMsg({ tipo: 'error', texto: 'Termino y definicion requeridos' }); return; }
    const token = localStorage.getItem('mervaleta_token');
    const res = await fetch(`${API}/glosario`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form)
    });
    const data = await res.json();
    if (data.error) { setMsg({ tipo: 'error', texto: data.error }); return; }
    setMsg({ tipo: 'ok', texto: 'Termino agregado al glosario' });
    setModalNuevo(false);
    setForm({ termino: '', definicion: '', categoria: 'General', ejemplo: '' });
    await cargar();
    setTimeout(() => setMsg(null), 3000);
  };

  const categorias = ['todas', ...new Set(terminos.map(t => t.categoria).filter(Boolean))].sort();

  if (cargando) return <Spinner />;

  const inputStyle = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: '#e2e8f0', outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' };

  return (
    <div style={{ minHeight: '100vh', background: '#0b1120', fontFamily: 'system-ui,-apple-system,sans-serif', color: '#e2e8f0' }}>

      {/* Nav */}
      <nav style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/conceptos" style={{ color: '#475569', textDecoration: 'none', fontSize: 18 }}>←</Link>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#38bdf8,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>📖</div>
        <span style={{ fontWeight: 800, fontSize: 15 }}>Glosario Financiero</span>
        <span style={{ fontSize: 11, color: '#475569', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 20 }}>{terminos.length} terminos</span>
        {esDocente && (
          <button onClick={() => setModalNuevo(true)}
            style={{ marginLeft: 'auto', background: 'linear-gradient(135deg,#38bdf8,#7c3aed)', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            + Agregar termino
          </button>
        )}
      </nav>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {msg && (
          <div style={{ borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 600,
            background: msg.tipo === 'ok' ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
            border: `1px solid ${msg.tipo === 'ok' ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)'}`,
            color: msg.tipo === 'ok' ? '#34d399' : '#f87171' }}>
            {msg.texto}
          </div>
        )}

        {/* Buscador prominente */}
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: '#475569' }}>🔍</div>
          <input
            ref={searchRef}
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar termino financiero..."
            style={{ ...inputStyle, paddingLeft: 42, fontSize: 15, padding: '14px 14px 14px 42px' }}
            autoFocus
          />
          {busqueda && (
            <button onClick={() => setBusqueda('')}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 16 }}>✕</button>
          )}
        </div>

        {/* Filtros por categoria */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
          {categorias.map(c => {
            const cfg = CATEGORIAS_COLOR[c] || CATEGORIAS_COLOR['General'];
            return (
              <button key={c} onClick={() => setCategoria(c)}
                style={{ flexShrink: 0, padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, transition: 'all .15s',
                  background: categoria === c ? cfg.color : 'rgba(255,255,255,0.05)',
                  color: categoria === c ? '#0b1120' : '#64748b' }}>
                {c === 'todas' ? 'Todas' : c}
              </button>
            );
          })}
        </div>

        {/* Resultados */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#475569' }}>Buscando...</div>
        ) : terminos.length === 0 ? (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '48px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            <p style={{ color: '#475569' }}>No encontramos "{busqueda}" en el glosario.</p>
            {esDocente && (
              <button onClick={() => { setForm(p => ({ ...p, termino: busqueda })); setModalNuevo(true); }}
                style={{ marginTop: 12, background: 'linear-gradient(135deg,#38bdf8,#7c3aed)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                + Agregar este termino
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {terminos.map(t => {
              const cfg = CATEGORIAS_COLOR[t.categoria] || CATEGORIAS_COLOR['General'];
              const isOpen = abierto === t.id;
              return (
                <div key={t.id}
                  style={{ background: isOpen ? 'rgba(56,189,248,0.05)' : 'rgba(255,255,255,0.03)', border: `1px solid ${isOpen ? 'rgba(56,189,248,0.25)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 12, overflow: 'hidden', cursor: 'pointer', transition: 'all .15s' }}
                  onClick={() => setAbierto(isOpen ? null : t.id)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, fontSize: 15, color: '#f1f5f9' }}>{t.termino}</span>
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, fontWeight: 700 }}>
                          {t.categoria}
                        </span>
                      </div>
                      {!isOpen && (
                        <p style={{ fontSize: 12, color: '#475569', margin: '4px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '90%' }}>
                          {t.definicion}
                        </p>
                      )}
                    </div>
                    <span style={{ color: '#334155', fontSize: 12, transition: 'transform .2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', flexShrink: 0 }}>▼</span>
                  </div>

                  {isOpen && (
                    <div style={{ padding: '0 16px 16px' }}>
                      <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '14px 16px', marginBottom: t.ejemplo ? 10 : 0 }}>
                        <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.7, margin: 0 }}>{t.definicion}</p>
                      </div>
                      {t.ejemplo && (
                        <div style={{ background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.15)', borderRadius: 10, padding: '10px 14px' }}>
                          <span style={{ fontSize: 10, color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Ejemplo: </span>
                          <span style={{ fontSize: 12, color: '#64748b' }}>{t.ejemplo}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal nuevo termino */}
      {modalNuevo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div style={{ background: '#131c2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, width: '100%', maxWidth: 460, padding: 28 }}>
            <h3 style={{ color: '#f1f5f9', fontWeight: 800, margin: '0 0 20px', fontSize: 18 }}>Nuevo termino</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Termino *</label>
                <input placeholder="Ej: Dividendo" value={form.termino} onChange={e => setForm(p => ({ ...p, termino: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Definicion *</label>
                <textarea placeholder="Explicacion clara y simple del termino..." value={form.definicion} onChange={e => setForm(p => ({ ...p, definicion: e.target.value }))}
                  style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Categoria</label>
                  <select value={form.categoria} onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))} style={inputStyle}>
                    {Object.keys(CATEGORIAS_COLOR).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Ejemplo (opcional)</label>
                <input placeholder="Ej: Si GGAL reparte dividendos..." value={form.ejemplo} onChange={e => setForm(p => ({ ...p, ejemplo: e.target.value }))} style={inputStyle} />
              </div>
            </div>
            {msg && msg.tipo === 'error' && (
              <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 8, fontSize: 13, color: '#f87171' }}>{msg.texto}</div>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setModalNuevo(false)}
                style={{ flex: 1, background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '12px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={crear}
                style={{ flex: 1, background: 'linear-gradient(135deg,#38bdf8,#7c3aed)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
                Agregar al glosario
              </button>
            </div>
          </div>
        </div>
      )}
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
