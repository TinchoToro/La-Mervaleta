// pages/banco-desafios.jsx – Banco de desafios por curriculum
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

const DIFICULTAD = {
  facil:  { color: '#34d399', bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.25)',  label: 'Facil'  },
  medio:  { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.25)',  label: 'Medio'  },
  dificil:{ color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)', label: 'Dificil'},
};

const TIPO_ICONO = {
  operacion:      '📈',
  diversificacion:'🌐',
  educativo:      '📚',
  estrategia:     '♟️',
  riesgo:         '⚠️',
  rendimiento:    '🏆',
  habito:         '📅',
};

const ANIOS = ['todos', '4to', '5to', '6to', '7mo', 'general'];
const ANIOS_LABEL = { todos: 'Todos', '4to': '4° Año', '5to': '5° Año', '6to': '6° Año', '7mo': '7° Año', general: 'General' };

export default function BancoDesafios() {
  const router = useRouter();
  const { usuario, cargando } = useAuth();
  const [desafios, setDesafios]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filtroAnio, setFiltroAnio] = useState('todos');
  const [filtroDif, setFiltroDif]   = useState('todos');
  const [modalNuevo, setModalNuevo] = useState(false);
  const [modalAsignar, setModalAsignar] = useState(null);
  const [msg, setMsg]             = useState(null);
  const [form, setForm]           = useState({ titulo: '', descripcion: '', tipo: 'operacion', anio_cursada: '', materia: 'General', dificultad: 'medio', puntos_bonus: 300 });
  const [fechaAsignar, setFechaAsignar] = useState({ inicio: '', fin: '' });

  const esDocente = usuario?.rol === 'docente' || usuario?.rol === 'admin';

  useEffect(() => {
    if (!cargando && !usuario) { router.push('/login'); return; }
    if (!usuario) return;
    cargar();
  }, [usuario, cargando]);

  const cargar = async () => {
    setLoading(true);
    const data = await apiFetch('/banco-desafios');
    setDesafios(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const filtrados = desafios.filter(d => {
    const matchAnio = filtroAnio === 'todos' ? true :
                      filtroAnio === 'general' ? !d.anio_cursada :
                      d.anio_cursada === filtroAnio;
    const matchDif  = filtroDif === 'todos' || d.dificultad === filtroDif;
    return matchAnio && matchDif;
  });

  // Agrupar por año
  const grupos = {};
  filtrados.forEach(d => {
    const key = d.anio_cursada || 'General';
    if (!grupos[key]) grupos[key] = [];
    grupos[key].push(d);
  });
  const ordenGrupos = ['4to','5to','6to','7mo','General'].filter(k => grupos[k]);

  const crear = async () => {
    if (!form.titulo || !form.descripcion) { setMsg({ tipo: 'error', texto: 'Titulo y descripcion requeridos' }); return; }
    const data = await apiFetch('/banco-desafios', { method: 'POST', body: JSON.stringify(form) });
    if (data.error) { setMsg({ tipo: 'error', texto: data.error }); return; }
    setMsg({ tipo: 'ok', texto: 'Desafio creado y agregado al banco' });
    setModalNuevo(false);
    await cargar();
    setTimeout(() => setMsg(null), 3000);
  };

  const asignar = async () => {
    if (!fechaAsignar.inicio || !fechaAsignar.fin) { setMsg({ tipo: 'error', texto: 'Definí fecha de inicio y fin' }); return; }
    const data = await apiFetch(`/banco-desafios/${modalAsignar.id}/asignar`, {
      method: 'POST',
      body: JSON.stringify({ fecha_inicio: fechaAsignar.inicio, fecha_fin: fechaAsignar.fin })
    });
    if (data.error) { setMsg({ tipo: 'error', texto: data.error }); return; }
    setMsg({ tipo: 'ok', texto: `"${modalAsignar.titulo}" asignado a la liga activa` });
    setModalAsignar(null);
    setTimeout(() => setMsg(null), 3000);
  };

  if (cargando || loading) return <Spinner />;

  const inputStyle = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: '#e2e8f0', outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' };

  return (
    <div style={{ minHeight: '100vh', background: '#0b1120', fontFamily: 'system-ui,-apple-system,sans-serif', color: '#e2e8f0' }}>

      <nav style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/admin" style={{ color: '#475569', textDecoration: 'none', fontSize: 18 }}>←</Link>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#f59e0b,#ef4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🎯</div>
        <span style={{ fontWeight: 800, fontSize: 15 }}>Banco de Desafios</span>
        <span style={{ fontSize: 11, color: '#475569', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 20 }}>{desafios.length} desafios</span>
        {esDocente && (
          <button onClick={() => setModalNuevo(true)}
            style={{ marginLeft: 'auto', background: 'linear-gradient(135deg,#f59e0b,#ef4444)', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            + Nuevo desafio
          </button>
        )}
      </nav>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {msg && (
          <div style={{ borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 600,
            background: msg.tipo === 'ok' ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
            border: `1px solid ${msg.tipo === 'ok' ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)'}`,
            color: msg.tipo === 'ok' ? '#34d399' : '#f87171' }}>
            {msg.texto}
          </div>
        )}

        {/* Filtros */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
            {ANIOS.map(a => (
              <button key={a} onClick={() => setFiltroAnio(a)}
                style={{ flexShrink: 0, padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                  background: filtroAnio === a ? '#7c3aed' : 'rgba(255,255,255,0.06)',
                  color: filtroAnio === a ? '#fff' : '#64748b' }}>
                {ANIOS_LABEL[a]}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['todos','facil','medio','dificil'].map(d => (
              <button key={d} onClick={() => setFiltroDif(d)}
                style={{ flexShrink: 0, padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                  background: filtroDif === d ? (DIFICULTAD[d]?.color || '#64748b') : 'rgba(255,255,255,0.04)',
                  color: filtroDif === d ? '#0b1120' : '#64748b' }}>
                {d === 'todos' ? 'Todas las dificultades' : DIFICULTAD[d]?.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grupos por año */}
        {ordenGrupos.map(key => (
          <div key={key}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ height: 1, flex: 1, background: 'rgba(255,255,255,0.06)' }} />
              <span style={{ fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: 1, padding: '0 12px', background: '#0b1120' }}>
                {key === 'General' ? '🌐 Para todos los años' : `📖 ${key} Año`}
              </span>
              <div style={{ height: 1, flex: 1, background: 'rgba(255,255,255,0.06)' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 10 }}>
              {grupos[key].map(d => {
                const dif = DIFICULTAD[d.dificultad] || DIFICULTAD.medio;
                return (
                  <div key={d.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <span style={{ fontSize: 16 }}>{TIPO_ICONO[d.tipo] || '🎯'}</span>
                          <span style={{ fontWeight: 700, fontSize: 14, color: '#f1f5f9' }}>{d.titulo}</span>
                        </div>
                        <p style={{ fontSize: 12, color: '#64748b', margin: 0, lineHeight: 1.5 }}>{d.descripcion}</p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: dif.bg, color: dif.color, border: `1px solid ${dif.border}`, fontWeight: 700 }}>
                        {dif.label}
                      </span>
                      {d.materia && (
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'rgba(124,58,237,0.1)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.2)', fontWeight: 600 }}>
                          {d.materia}
                        </span>
                      )}
                      <span style={{ fontSize: 11, color: '#fbbf24', marginLeft: 'auto', fontWeight: 700 }}>
                        +{d.puntos_bonus} pts
                      </span>
                    </div>

                    {esDocente && (
                      <button onClick={() => { setModalAsignar(d); setFechaAsignar({ inicio: '', fin: '' }); }}
                        style={{ background: 'rgba(245,158,11,0.1)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8, padding: '8px', fontSize: 12, fontWeight: 700, cursor: 'pointer', width: '100%' }}>
                        ▶ Asignar a la liga activa
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Modal nuevo desafio */}
      {modalNuevo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div style={{ background: '#131c2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, width: '100%', maxWidth: 480, padding: 28, maxHeight: '90vh', overflow: 'auto' }}>
            <h3 style={{ color: '#f1f5f9', fontWeight: 800, margin: '0 0 20px', fontSize: 18 }}>Nuevo desafio personalizado</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Titulo *</label>
                <input placeholder="Nombre del desafio" value={form.titulo} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Descripcion *</label>
                <textarea placeholder="Que debe hacer el alumno para completarlo..." value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
                  style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Año cursada</label>
                  <select value={form.anio_cursada} onChange={e => setForm(p => ({ ...p, anio_cursada: e.target.value }))} style={inputStyle}>
                    <option value="">General</option>
                    {['4to','5to','6to','7mo'].map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Dificultad</label>
                  <select value={form.dificultad} onChange={e => setForm(p => ({ ...p, dificultad: e.target.value }))} style={inputStyle}>
                    <option value="facil">Facil</option>
                    <option value="medio">Medio</option>
                    <option value="dificil">Dificil</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Materia</label>
                  <input placeholder="Ej: Economia" value={form.materia} onChange={e => setForm(p => ({ ...p, materia: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Puntos bonus</label>
                  <input type="number" value={form.puntos_bonus} onChange={e => setForm(p => ({ ...p, puntos_bonus: Number(e.target.value) }))} style={inputStyle} />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setModalNuevo(false)}
                style={{ flex: 1, background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '12px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={crear}
                style={{ flex: 1, background: 'linear-gradient(135deg,#f59e0b,#ef4444)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
                Crear desafio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal asignar */}
      {modalAsignar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div style={{ background: '#131c2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, width: '100%', maxWidth: 400, padding: 28 }}>
            <h3 style={{ color: '#f1f5f9', fontWeight: 800, margin: '0 0 8px', fontSize: 16 }}>Asignar a la liga activa</h3>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>{modalAsignar.titulo}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Fecha inicio</label>
                <input type="date" value={fechaAsignar.inicio} onChange={e => setFechaAsignar(p => ({ ...p, inicio: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Fecha fin</label>
                <input type="date" value={fechaAsignar.fin} onChange={e => setFechaAsignar(p => ({ ...p, fin: e.target.value }))} style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModalAsignar(null)}
                style={{ flex: 1, background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '12px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={asignar}
                style={{ flex: 1, background: 'linear-gradient(135deg,#f59e0b,#ef4444)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
                Asignar
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
