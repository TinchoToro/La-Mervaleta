// pages/temporadas.jsx – Gestión de temporadas (solo admin)
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const apiFetch = (ep, opts = {}) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('mervaleta_token') : null;
  return fetch(`${API}${ep}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...opts.headers }
  }).then(r => r.json());
};

const FORM_VACIO = { nombre: '', descripcion: '', fecha_inicio: '', fecha_fin: '', capital_inicial: '1000000' };

export default function Temporadas() {
  const router = useRouter();
  const { usuario, cargando } = useAuth();
  const [temporadas, setTemporadas] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [modal, setModal]           = useState(false);
  const [form, setForm]             = useState(FORM_VACIO);
  const [editando, setEditando]     = useState(null);
  const [msg, setMsg]               = useState(null);
  const [rankingModal, setRankingModal] = useState(null);
  const [rankingData, setRankingData]   = useState([]);

  useEffect(() => {
    if (!cargando && !usuario) { router.push('/login'); return; }
    if (!cargando && usuario?.rol !== 'admin') { router.push('/dashboard'); return; }
    if (!usuario) return;
    cargar();
  }, [usuario, cargando]);

  const cargar = async () => {
    setLoading(true);
    const data = await apiFetch('/temporadas');
    setTemporadas(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const guardar = async () => {
    if (!form.nombre || !form.fecha_inicio || !form.fecha_fin) {
      setMsg({ tipo: 'error', texto: 'Completa nombre, fecha inicio y fecha fin' }); return;
    }
    const opts = { method: editando ? 'PUT' : 'POST', body: JSON.stringify(form) };
    const ep = editando ? `/temporadas/${editando}` : '/temporadas';
    const data = await apiFetch(ep, opts);
    if (data.error) { setMsg({ tipo: 'error', texto: data.error }); return; }
    setMsg({ tipo: 'ok', texto: editando ? 'Temporada actualizada' : 'Temporada creada' });
    setModal(false); setForm(FORM_VACIO); setEditando(null);
    await cargar();
    setTimeout(() => setMsg(null), 3000);
  };

  const activar = async (id, nombre) => {
    const data = await apiFetch(`/temporadas/${id}/activar`, { method: 'PUT' });
    if (data.error) { setMsg({ tipo: 'error', texto: data.error }); return; }
    setMsg({ tipo: 'ok', texto: `"${nombre}" activada` });
    await cargar();
    setTimeout(() => setMsg(null), 3000);
  };

  const verRanking = async (t) => {
    const data = await apiFetch(`/temporadas/${t.id}/ranking`);
    setRankingData(Array.isArray(data) ? data : []);
    setRankingModal(t);
  };

  const abrirEditar = (t) => {
    setForm({
      nombre: t.nombre,
      descripcion: t.descripcion || '',
      fecha_inicio: t.fecha_inicio?.slice(0, 10),
      fecha_fin: t.fecha_fin?.slice(0, 10),
      capital_inicial: t.capital_inicial,
    });
    setEditando(t.id);
    setModal(true);
  };

  const diasRestantes = (fecha_fin) => {
    const hoy = new Date();
    const fin = new Date(fecha_fin);
    const diff = Math.ceil((fin - hoy) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const estadoTemporada = (t) => {
    const hoy = new Date();
    const inicio = new Date(t.fecha_inicio);
    const fin = new Date(t.fecha_fin);
    if (hoy < inicio) return { label: 'Programada', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' };
    if (hoy > fin)    return { label: 'Finalizada', color: '#475569', bg: 'rgba(71,85,105,0.1)' };
    return { label: 'En curso', color: '#34d399', bg: 'rgba(52,211,153,0.1)' };
  };

  if (cargando || loading) return <Spinner />;

  const inputStyle = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: '#e2e8f0', outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' };

  return (
    <div style={{ minHeight: '100vh', background: '#0b1120', fontFamily: 'system-ui,-apple-system,sans-serif', color: '#e2e8f0' }}>

      {/* Nav */}
      <nav style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/admin" style={{ color: '#475569', textDecoration: 'none', fontSize: 18 }}>←</Link>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#7c3aed,#0284c7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>📅</div>
        <span style={{ fontWeight: 800, fontSize: 15 }}>Temporadas · Liga Escolar</span>
        <button onClick={() => { setModal(true); setForm(FORM_VACIO); setEditando(null); }}
          style={{ marginLeft: 'auto', background: 'linear-gradient(135deg,#059669,#0284c7)', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          + Nueva temporada
        </button>
      </nav>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {msg && (
          <div style={{ borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 600,
            background: msg.tipo === 'ok' ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
            border: `1px solid ${msg.tipo === 'ok' ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)'}`,
            color: msg.tipo === 'ok' ? '#34d399' : '#f87171' }}>
            {msg.texto}
          </div>
        )}

        {temporadas.length === 0 ? (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '60px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📅</div>
            <p style={{ color: '#475569', marginBottom: 20, fontSize: 15 }}>No hay temporadas creadas todavía.</p>
            <button onClick={() => setModal(true)}
              style={{ background: 'linear-gradient(135deg,#059669,#0284c7)', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              Crear primera temporada
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {temporadas.map(t => {
              const estado = estadoTemporada(t);
              const dias = diasRestantes(t.fecha_fin);
              return (
                <div key={t.id} style={{ background: t.activa ? 'rgba(52,211,153,0.05)' : 'rgba(255,255,255,0.03)', border: `1px solid ${t.activa ? 'rgba(52,211,153,0.25)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 16, padding: '20px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 900, fontSize: 18, color: '#f1f5f9' }}>{t.nombre}</span>
                        {t.activa && (
                          <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)', fontWeight: 700 }}>
                            ● ACTIVA
                          </span>
                        )}
                        <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: estado.bg, color: estado.color, fontWeight: 700 }}>
                          {estado.label}
                        </span>
                      </div>
                      {t.descripcion && <p style={{ fontSize: 13, color: '#64748b', marginBottom: 10 }}>{t.descripcion}</p>}
                      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 12, color: '#475569' }}>
                        <span>📅 Inicio: <strong style={{ color: '#94a3b8' }}>{new Date(t.fecha_inicio).toLocaleDateString('es-AR')}</strong></span>
                        <span>🏁 Fin: <strong style={{ color: '#94a3b8' }}>{new Date(t.fecha_fin).toLocaleDateString('es-AR')}</strong></span>
                        <span>💰 Capital: <strong style={{ color: '#94a3b8' }}>${Number(t.capital_inicial).toLocaleString('es-AR')}</strong></span>
                        <span>👥 Participantes: <strong style={{ color: '#94a3b8' }}>{t.total_participantes}</strong></span>
                        {dias > 0 && estado.label === 'En curso' && (
                          <span>⏳ <strong style={{ color: '#fbbf24' }}>{dias} días restantes</strong></span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
                      <button onClick={() => verRanking(t)}
                        style={{ background: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                        🏆 Ranking
                      </button>
                      <button onClick={() => abrirEditar(t)}
                        style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                        ✏️ Editar
                      </button>
                      {!t.activa && (
                        <button onClick={() => activar(t.id, t.nombre)}
                          style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                          ▶ Activar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal crear/editar */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div style={{ background: '#131c2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, width: '100%', maxWidth: 480, padding: 28 }}>
            <h3 style={{ color: '#f1f5f9', fontWeight: 800, margin: '0 0 24px', fontSize: 18 }}>
              {editando ? 'Editar temporada' : 'Nueva temporada'}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Nombre *</label>
                <input placeholder="Ej: Liga 2026 · 1er Trimestre" value={form.nombre}
                  onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Descripción</label>
                <input placeholder="Descripción opcional" value={form.descripcion}
                  onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Fecha inicio *</label>
                  <input type="date" value={form.fecha_inicio}
                    onChange={e => setForm(p => ({ ...p, fecha_inicio: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Fecha fin *</label>
                  <input type="date" value={form.fecha_fin}
                    onChange={e => setForm(p => ({ ...p, fecha_fin: e.target.value }))} style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Capital inicial por alumno</label>
                <input type="number" value={form.capital_inicial}
                  onChange={e => setForm(p => ({ ...p, capital_inicial: e.target.value }))} style={inputStyle} />
              </div>
            </div>

            {msg && msg.tipo === 'error' && (
              <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 8, fontSize: 13, color: '#f87171' }}>
                {msg.texto}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => { setModal(false); setEditando(null); setForm(FORM_VACIO); }}
                style={{ flex: 1, background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '12px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={guardar}
                style={{ flex: 1, background: 'linear-gradient(135deg,#059669,#0284c7)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
                {editando ? 'Guardar cambios' : 'Crear temporada'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal ranking de temporada */}
      {rankingModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div style={{ background: '#131c2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, width: '100%', maxWidth: 560, maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ color: '#f1f5f9', fontWeight: 800, margin: 0, fontSize: 16 }}>🏆 Ranking · {rankingModal.nombre}</h3>
                <p style={{ fontSize: 12, color: '#475569', margin: '2px 0 0' }}>{rankingData.length} participantes</p>
              </div>
              <button onClick={() => setRankingModal(null)}
                style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, width: 32, height: 32, color: '#64748b', cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>
            <div style={{ overflow: 'auto', flex: 1 }}>
              {rankingData.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#475569' }}>No hay participantes en esta temporada todavía.</div>
              ) : rankingData.map((a, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ width: 32, textAlign: 'center', fontSize: a.posicion <= 3 ? 20 : 13, color: '#334155', fontWeight: 800 }}>
                    {a.posicion <= 3 ? ['🥇','🥈','🥉'][a.posicion-1] : `#${a.posicion}`}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#e2e8f0' }}>{a.nombre_completo}</div>
                    {a.escuela && <div style={{ fontSize: 11, color: '#334155' }}>{a.escuela}</div>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: a.rendimiento_pct >= 0 ? '#34d399' : '#f87171' }}>
                      {a.rendimiento_pct >= 0 ? '+' : ''}{a.rendimiento_pct}%
                    </div>
                    <div style={{ fontSize: 11, color: '#334155' }}>${Number(a.capital_actual).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</div>
                  </div>
                </div>
              ))}
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
