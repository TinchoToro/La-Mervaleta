// pages/docente.jsx – Panel docente unificado completo
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

const TABS = [
  { id: 'liga',       label: '📊 Mi Liga',     desc: 'Resumen y ranking' },
  { id: 'alumnos',    label: '👥 Alumnos',      desc: 'Gestionar alumnos' },
  { id: 'temporadas', label: '📅 Temporadas',   desc: 'Fechas de liga' },
  { id: 'desafios',   label: '🎯 Desafíos',     desc: 'Asignar desafíos' },
  { id: 'academia',   label: '📚 Academia',     desc: 'Conceptos y glosario' },
];

const DIFICULTAD = {
  facil:   { color: '#34d399', label: 'Fácil'   },
  medio:   { color: '#fbbf24', label: 'Medio'   },
  dificil: { color: '#f87171', label: 'Difícil' },
};

const inputStyle = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: '#e2e8f0', outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' };

export default function Docente() {
  const router = useRouter();
  const { usuario, cargando, logout } = useAuth();
  const [tab, setTab]               = useState('liga');
  const [loading, setLoading]       = useState(true);
  const [msg, setMsg]               = useState(null);

  const [resumen, setResumen]       = useState(null);
  const [alumnos, setAlumnos]       = useState([]);

  const [temporadas, setTemporadas] = useState([]);
  const [formTemp, setFormTemp]     = useState({ nombre: '', descripcion: '', fecha_inicio: '', fecha_fin: '', capital_inicial: '1000000' });
  const [editandoTemp, setEditandoTemp] = useState(null);
  const [modalTemp, setModalTemp]   = useState(false);

  const [desafios, setDesafios]     = useState([]);
  const [filtroAnio, setFiltroAnio] = useState('todos');
  const [modalAsignar, setModalAsignar] = useState(null);
  const [fechaAsignar, setFechaAsignar] = useState({ inicio: '', fin: '' });

  const [conceptos, setConceptos]   = useState([]);
  const [glosario, setGlosario]     = useState([]);
  const [busGlosario, setBusGlosario] = useState('');
  const [formConcepto, setFormConcepto] = useState({ titulo: '', contenido: '', nivel: 'basico' });
  const [formGlosario, setFormGlosario] = useState({ termino: '', definicion: '', categoria: 'General', ejemplo: '' });
  const [modalConcepto, setModalConcepto] = useState(false);
  const [modalGlosario, setModalGlosario] = useState(false);

  useEffect(() => {
    if (!cargando && !usuario) { router.push('/login'); return; }
    if (!cargando && usuario && !['docente','admin'].includes(usuario.rol)) { router.push('/dashboard'); return; }
    if (!usuario) return;
    cargarTodo();
  }, [usuario, cargando]);

  const cargarTodo = async () => {
    setLoading(true);
    try {
      const [r, a, t, d, c, g] = await Promise.all([
        apiFetch('/docente/resumen').catch(() => null),
        apiFetch('/docente/alumnos').catch(() => []),
        apiFetch('/temporadas').catch(() => []),
        apiFetch('/banco-desafios').catch(() => []),
        apiFetch('/conceptos').catch(() => []),
        apiFetch('/glosario').catch(() => []),
      ]);
      setResumen(r);
      setAlumnos(Array.isArray(a) ? a : []);
      setTemporadas(Array.isArray(t) ? t : []);
      setDesafios(Array.isArray(d) ? d : []);
      setConceptos(Array.isArray(c) ? c : []);
      setGlosario(Array.isArray(g) ? g : []);
    } catch {}
    setLoading(false);
  };

  const showMsg = (tipo, texto) => { setMsg({ tipo, texto }); setTimeout(() => setMsg(null), 3000); };

  const guardarTemp = async () => {
    if (!formTemp.nombre || !formTemp.fecha_inicio || !formTemp.fecha_fin) { showMsg('error', 'Completá nombre y fechas'); return; }
    const ep = editandoTemp ? `/temporadas/${editandoTemp}` : '/temporadas';
    const data = await apiFetch(ep, { method: editandoTemp ? 'PUT' : 'POST', body: JSON.stringify(formTemp) });
    if (data.error) { showMsg('error', data.error); return; }
    showMsg('ok', editandoTemp ? 'Temporada actualizada' : 'Temporada creada');
    setModalTemp(false); setFormTemp({ nombre: '', descripcion: '', fecha_inicio: '', fecha_fin: '', capital_inicial: '1000000' }); setEditandoTemp(null);
    const t = await apiFetch('/temporadas').catch(() => []);
    setTemporadas(Array.isArray(t) ? t : []);
  };

  const activarTemp = async (id, nombre) => {
    const data = await apiFetch(`/temporadas/${id}/activar`, { method: 'PUT' });
    if (data.error) { showMsg('error', data.error); return; }
    showMsg('ok', `"${nombre}" activada`);
    const t = await apiFetch('/temporadas').catch(() => []);
    setTemporadas(Array.isArray(t) ? t : []);
  };

  const asignarDesafio = async () => {
    if (!fechaAsignar.inicio || !fechaAsignar.fin) { showMsg('error', 'Definí fechas'); return; }
    const data = await apiFetch(`/banco-desafios/${modalAsignar.id}/asignar`, {
      method: 'POST', body: JSON.stringify({ fecha_inicio: fechaAsignar.inicio, fecha_fin: fechaAsignar.fin })
    });
    if (data.error) { showMsg('error', data.error); return; }
    showMsg('ok', `"${modalAsignar.titulo}" asignado`);
    setModalAsignar(null);
  };

  const crearConcepto = async () => {
    if (!formConcepto.titulo || !formConcepto.contenido) { showMsg('error', 'Completá título y contenido'); return; }
    const data = await apiFetch('/conceptos', { method: 'POST', body: JSON.stringify(formConcepto) });
    if (data.error) { showMsg('error', data.error); return; }
    showMsg('ok', 'Concepto agregado');
    setModalConcepto(false); setFormConcepto({ titulo: '', contenido: '', nivel: 'basico' });
    const c = await apiFetch('/conceptos').catch(() => []);
    setConceptos(Array.isArray(c) ? c : []);
  };

  const crearGlosario = async () => {
    if (!formGlosario.termino || !formGlosario.definicion) { showMsg('error', 'Completá término y definición'); return; }
    const data = await apiFetch('/glosario', { method: 'POST', body: JSON.stringify(formGlosario) });
    if (data.error) { showMsg('error', data.error); return; }
    showMsg('ok', 'Término agregado al glosario');
    setModalGlosario(false); setFormGlosario({ termino: '', definicion: '', categoria: 'General', ejemplo: '' });
    const g = await apiFetch('/glosario').catch(() => []);
    setGlosario(Array.isArray(g) ? g : []);
  };
const eliminarAlumno = async (id, nombre) => {
  if (!confirm(`¿Eliminar a ${nombre} definitivamente? Se borrarán todos sus datos.`)) return;
  const data = await apiFetch(`/docente/alumnos/${id}`, { method: 'DELETE' });
  if (data.error) { showMsg('error', data.error); return; }
  showMsg('ok', `${nombre} eliminado`);
  setAlumnos(prev => prev.filter(a => a.id !== id));
};
  
  const resetearCartera = async (id, nombre) => {
    if (!confirm(`¿Resetear la cartera de ${nombre}?`)) return;
    const data = await apiFetch(`/admin/usuarios/${id}/resetear-cartera`, { method: 'POST' });
    if (data.error) { showMsg('error', data.error); return; }
    showMsg('ok', `Cartera de ${nombre} reseteada`);
  };

  const desafiosFiltrados = desafios.filter(d => {
    if (filtroAnio === 'todos') return true;
    if (filtroAnio === 'general') return !d.anio_cursada;
    return d.anio_cursada === filtroAnio;
  });

  if (cargando || loading) return <Spinner />;

  return (
    <div style={{ minHeight: '100vh', background: '#0b1120', fontFamily: 'system-ui,-apple-system,sans-serif', color: '#e2e8f0' }}>

      {/* Nav */}
      <nav style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#7c3aed,#0284c7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🎓</div>
        <div>
          <span style={{ fontWeight: 800, fontSize: 15 }}>Panel Docente</span>
          <span style={{ fontSize: 11, color: '#475569', marginLeft: 8 }}>La Mervaleta</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#64748b' }}>{usuario?.nombre} {usuario?.apellido}</span>
          {usuario?.rol === 'admin' && (
            <Link href="/admin" style={{ fontSize: 12, color: '#c084fc', textDecoration: 'none', fontWeight: 600 }}>⚙️ Admin</Link>
          )}
          <Link href="/dashboard" style={{ fontSize: 12, color: '#475569', textDecoration: 'none' }}>← Dashboard</Link>
          <button onClick={logout} style={{ fontSize: 11, padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#64748b', cursor: 'pointer' }}>Salir</button>
        </div>
      </nav>

      {/* Tabs */}
      <div style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 20px', display: 'flex', gap: 2, overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flexShrink: 0, padding: '14px 20px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 700, borderBottom: `2px solid ${tab === t.id ? '#0284c7' : 'transparent'}`, color: tab === t.id ? '#60a5fa' : '#475569', transition: 'all .15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '20px 16px' }}>

        {msg && (
          <div style={{ borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 600, marginBottom: 16,
            background: msg.tipo === 'ok' ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
            border: `1px solid ${msg.tipo === 'ok' ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)'}`,
            color: msg.tipo === 'ok' ? '#34d399' : '#f87171' }}>
            {msg.texto}
          </div>
        )}

        {/* ── MI LIGA ── */}
        {tab === 'liga' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
              {[
                { label: 'Alumnos inscriptos', valor: resumen?.total_alumnos || 0, color: '#60a5fa' },
                { label: 'Activos esta semana', valor: resumen?.activos_semana || 0, color: '#34d399' },
                { label: 'Rendimiento promedio', valor: `${resumen?.rendimiento_promedio || 0}%`, color: (resumen?.rendimiento_promedio || 0) >= 0 ? '#34d399' : '#f87171' },
                { label: 'Alertas activas', valor: resumen?.total_alertas || 0, color: '#f87171' },
                { label: 'Operaciones totales', valor: resumen?.total_operaciones || 0, color: '#fbbf24' },
                { label: 'Conceptos leídos', valor: resumen?.conceptos_leidos || 0, color: '#c084fc' },
              ].map(s => (
                <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '16px 18px' }}>
                  <div style={{ fontSize: 28, fontWeight: 900, color: s.color }}>{s.valor}</div>
                  <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700 }}>🏆 Ranking de tu liga</span>
                <Link href="/ranking" style={{ fontSize: 12, color: '#0284c7', textDecoration: 'none' }}>Ver completo →</Link>
              </div>
              {alumnos.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#475569' }}>No hay alumnos registrados todavía.</div>
              ) : [...alumnos].sort((a, b) => b.capital_actual - a.capital_actual).slice(0, 5).map((a, i) => {
                const rend = a.capital_inicial ? ((a.capital_actual - a.capital_inicial) / a.capital_inicial * 100).toFixed(2) : 0;
                return (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}
                    onClick={() => setAlumnoDetalle(alumnoDetalle?.id === a.id ? null : a)}>
                    <span style={{ fontSize: i < 3 ? 20 : 13, width: 28, textAlign: 'center' }}>{i < 3 ? ['🥇','🥈','🥉'][i] : `#${i+1}`}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{a.nombre} {a.apellido}</div>
                      <div style={{ fontSize: 11, color: '#475569' }}>{a.alertas?.length || 0} alertas · {a.total_operaciones || 0} operaciones</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, color: rend >= 0 ? '#34d399' : '#f87171' }}>{rend >= 0 ? '+' : ''}{rend}%</div>
                      <div style={{ fontSize: 11, color: '#334155' }}>${Number(a.capital_actual || 1000000).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Alertas pedagógicas — FIX: al.msg en lugar de al */}
            {alumnos.filter(a => a.alertas?.length > 0).length > 0 && (
              <div style={{ background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(248,113,113,0.1)' }}>
                  <span style={{ fontWeight: 700, color: '#f87171' }}>⚠️ Alertas pedagógicas</span>
                </div>
                {alumnos.filter(a => a.alertas?.length > 0).map(a => (
                  <div key={a.id} style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{a.nombre} {a.apellido}</div>
                    {a.alertas.map((al, i) => (
                      <div key={i} style={{ fontSize: 12, color: '#f87171', marginBottom: 2 }}>• {al.msg}</div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ALUMNOS ── */}
        {tab === 'alumnos' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 13, color: '#475569', marginBottom: 4 }}>{alumnos.length} alumnos registrados</div>
            {alumnos.length === 0 ? (
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '48px', textAlign: 'center', color: '#475569' }}>
                No hay alumnos registrados todavía.
              </div>
            ) : alumnos.map(a => {
              const rend = a.capital_inicial ? ((a.capital_actual - a.capital_inicial) / a.capital_inicial * 100).toFixed(2) : 0;
              return (
                <div key={a.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#059669,#0284c7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, color: '#fff', flexShrink: 0 }}>
                      {a.nombre?.charAt(0)}{a.apellido?.charAt(0)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{a.nombre} {a.apellido}</div>
                      <div style={{ fontSize: 12, color: '#475569' }}>{a.email} {a.anio_cursada ? `· ${a.anio_cursada}` : ''}</div>
                      <div style={{ fontSize: 11, color: '#334155', marginTop: 2 }}>
                        {a.total_operaciones || 0} ops · {a.conceptos_leidos || 0}/20 conceptos · {a.alertas?.length || 0} alertas
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', marginRight: 8 }}>
                      <div style={{ fontWeight: 800, color: rend >= 0 ? '#34d399' : '#f87171' }}>{rend >= 0 ? '+' : ''}{rend}%</div>
                      <div style={{ fontSize: 11, color: '#475569' }}>${Number(a.capital_actual || 1000000).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</div>
                    </div>
                    <button onClick={() => resetearCartera(a.id, `${a.nombre} ${a.apellido}`)}
                      style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                      Resetear cartera
                    </button>
                  </div>
                  {/* FIX: al.msg en lugar de al */}
                  {a.alertas?.length > 0 && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      {a.alertas.map((al, i) => <div key={i} style={{ fontSize: 11, color: '#f87171' }}>⚠️ {al.msg}</div>)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── TEMPORADAS ── */}
        {tab === 'temporadas' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button onClick={() => { setModalTemp(true); setFormTemp({ nombre: '', descripcion: '', fecha_inicio: '', fecha_fin: '', capital_inicial: '1000000' }); setEditandoTemp(null); }}
              style={{ alignSelf: 'flex-start', background: 'linear-gradient(135deg,#059669,#0284c7)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              + Nueva temporada
            </button>

            {temporadas.length === 0 ? (
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '48px', textAlign: 'center', color: '#475569' }}>
                No hay temporadas creadas. ¡Creá la primera!
              </div>
            ) : temporadas.map(t => {
              const hoy = new Date();
              const fin = new Date(t.fecha_fin);
              const dias = Math.ceil((fin - hoy) / (1000 * 60 * 60 * 24));
              const estado = hoy < new Date(t.fecha_inicio) ? { label: 'Programada', color: '#60a5fa' } :
                             hoy > fin ? { label: 'Finalizada', color: '#475569' } :
                             { label: 'En curso', color: '#34d399' };
              return (
                <div key={t.id} style={{ background: t.activa ? 'rgba(52,211,153,0.05)' : 'rgba(255,255,255,0.03)', border: `1px solid ${t.activa ? 'rgba(52,211,153,0.25)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 14, padding: '18px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 900, fontSize: 16 }}>{t.nombre}</span>
                        {t.activa && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)', fontWeight: 700 }}>● ACTIVA</span>}
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'rgba(255,255,255,0.06)', color: estado.color, fontWeight: 700 }}>{estado.label}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#475569', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        <span>📅 {new Date(t.fecha_inicio).toLocaleDateString('es-AR')} → {new Date(t.fecha_fin).toLocaleDateString('es-AR')}</span>
                        <span>💰 ${Number(t.capital_inicial).toLocaleString('es-AR')}</span>
                        {dias > 0 && estado.label === 'En curso' && <span style={{ color: '#fbbf24' }}>⏳ {dias} días restantes</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => { setFormTemp({ nombre: t.nombre, descripcion: t.descripcion || '', fecha_inicio: t.fecha_inicio?.slice(0,10), fecha_fin: t.fecha_fin?.slice(0,10), capital_inicial: t.capital_inicial }); setEditandoTemp(t.id); setModalTemp(true); }}
                        style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                        ✏️ Editar
                      </button>
                      {!t.activa && (
                        <button onClick={() => activarTemp(t.id, t.nombre)}
                          style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
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

        {/* ── DESAFÍOS ── */}
        {tab === 'desafios' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['todos','4to','5to','6to','7mo','general'].map(a => (
                <button key={a} onClick={() => setFiltroAnio(a)}
                  style={{ padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                    background: filtroAnio === a ? '#7c3aed' : 'rgba(255,255,255,0.06)',
                    color: filtroAnio === a ? '#fff' : '#64748b' }}>
                  {a === 'todos' ? 'Todos' : a === 'general' ? 'General' : `${a} Año`}
                </button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 10 }}>
              {desafiosFiltrados.map(d => {
                const dif = DIFICULTAD[d.dificultad] || DIFICULTAD.medio;
                return (
                  <div key={d.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{d.titulo}</div>
                      <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{d.descripcion}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: `${dif.color}20`, color: dif.color, fontWeight: 700 }}>{dif.label}</span>
                      {d.materia && <span style={{ fontSize: 11, color: '#a78bfa', background: 'rgba(124,58,237,0.1)', padding: '2px 8px', borderRadius: 20 }}>{d.materia}</span>}
                      <span style={{ fontSize: 11, color: '#fbbf24', marginLeft: 'auto', fontWeight: 700 }}>+{d.puntos_bonus} pts</span>
                    </div>
                    <button onClick={() => { setModalAsignar(d); setFechaAsignar({ inicio: '', fin: '' }); }}
                      style={{ background: 'rgba(245,158,11,0.1)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8, padding: '8px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      ▶ Asignar a la liga
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── ACADEMIA ── */}
        {tab === 'academia' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700 }}>📚 Conceptos educativos ({conceptos.length})</span>
                <button onClick={() => setModalConcepto(true)}
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#0284c7)', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  + Agregar concepto
                </button>
              </div>
              <div style={{ maxHeight: 300, overflow: 'auto' }}>
                {conceptos.map((c, i) => (
                  <div key={c.id} style={{ padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{c.titulo}</span>
                      <span style={{ marginLeft: 8, fontSize: 11, color: '#475569', background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: 10 }}>{c.nivel}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700 }}>📖 Glosario financiero ({glosario.length})</span>
                <button onClick={() => setModalGlosario(true)}
                  style={{ background: 'linear-gradient(135deg,#38bdf8,#7c3aed)', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  + Agregar término
                </button>
              </div>
              <div style={{ padding: '10px 16px' }}>
                <input value={busGlosario} onChange={e => setBusGlosario(e.target.value)}
                  placeholder="Buscar término..." style={{ ...inputStyle, marginBottom: 8 }} />
              </div>
              <div style={{ maxHeight: 250, overflow: 'auto' }}>
                {glosario.filter(g => g.termino.toLowerCase().includes(busGlosario.toLowerCase())).map(g => (
                  <div key={g.id} style={{ padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{g.termino}</span>
                      <span style={{ marginLeft: 8, fontSize: 11, color: '#475569' }}>{g.categoria}</span>
                    </div>
                    <span style={{ fontSize: 11, color: '#334155', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.definicion}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <Link href="/conceptos" style={{ flex: 1, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 12, padding: '14px', textAlign: 'center', textDecoration: 'none', color: '#a78bfa', fontWeight: 700, fontSize: 13 }}>
                Ver academia completa →
              </Link>
              <Link href="/glosario" style={{ flex: 1, background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: 12, padding: '14px', textAlign: 'center', textDecoration: 'none', color: '#38bdf8', fontWeight: 700, fontSize: 13 }}>
                Ver glosario completo →
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Modal nueva/editar temporada */}
      {modalTemp && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div style={{ background: '#131c2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, width: '100%', maxWidth: 480, padding: 28 }}>
            <h3 style={{ color: '#f1f5f9', fontWeight: 800, margin: '0 0 20px', fontSize: 18 }}>{editandoTemp ? 'Editar temporada' : 'Nueva temporada'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input placeholder="Nombre *" value={formTemp.nombre} onChange={e => setFormTemp(p => ({ ...p, nombre: e.target.value }))} style={inputStyle} />
              <input placeholder="Descripción" value={formTemp.descripcion} onChange={e => setFormTemp(p => ({ ...p, descripcion: e.target.value }))} style={inputStyle} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Fecha inicio *</label><input type="date" value={formTemp.fecha_inicio} onChange={e => setFormTemp(p => ({ ...p, fecha_inicio: e.target.value }))} style={inputStyle} /></div>
                <div><label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Fecha fin *</label><input type="date" value={formTemp.fecha_fin} onChange={e => setFormTemp(p => ({ ...p, fecha_fin: e.target.value }))} style={inputStyle} /></div>
              </div>
              <input type="number" placeholder="Capital inicial" value={formTemp.capital_inicial} onChange={e => setFormTemp(p => ({ ...p, capital_inicial: e.target.value }))} style={inputStyle} />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setModalTemp(false)} style={{ flex: 1, background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '12px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={guardarTemp} style={{ flex: 1, background: 'linear-gradient(135deg,#059669,#0284c7)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>{editandoTemp ? 'Guardar cambios' : 'Crear temporada'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal asignar desafío */}
      {modalAsignar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div style={{ background: '#131c2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, width: '100%', maxWidth: 400, padding: 28 }}>
            <h3 style={{ color: '#f1f5f9', fontWeight: 800, margin: '0 0 8px', fontSize: 16 }}>Asignar desafío</h3>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>{modalAsignar.titulo}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              <div><label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Inicio</label><input type="date" value={fechaAsignar.inicio} onChange={e => setFechaAsignar(p => ({ ...p, inicio: e.target.value }))} style={inputStyle} /></div>
              <div><label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Fin</label><input type="date" value={fechaAsignar.fin} onChange={e => setFechaAsignar(p => ({ ...p, fin: e.target.value }))} style={inputStyle} /></div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModalAsignar(null)} style={{ flex: 1, background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '12px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={asignarDesafio} style={{ flex: 1, background: 'linear-gradient(135deg,#f59e0b,#ef4444)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>Asignar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nuevo concepto */}
      {modalConcepto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div style={{ background: '#131c2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, width: '100%', maxWidth: 480, padding: 28 }}>
            <h3 style={{ color: '#f1f5f9', fontWeight: 800, margin: '0 0 20px', fontSize: 18 }}>Nuevo concepto educativo</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input placeholder="Título *" value={formConcepto.titulo} onChange={e => setFormConcepto(p => ({ ...p, titulo: e.target.value }))} style={inputStyle} />
              <textarea placeholder="Contenido *" value={formConcepto.contenido} onChange={e => setFormConcepto(p => ({ ...p, contenido: e.target.value }))} style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }} />
              <select value={formConcepto.nivel} onChange={e => setFormConcepto(p => ({ ...p, nivel: e.target.value }))} style={inputStyle}>
                <option value="basico">Básico</option>
                <option value="intermedio">Intermedio</option>
                <option value="avanzado">Avanzado</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setModalConcepto(false)} style={{ flex: 1, background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '12px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={crearConcepto} style={{ flex: 1, background: 'linear-gradient(135deg,#7c3aed,#0284c7)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>Crear concepto</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nuevo término glosario */}
      {modalGlosario && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div style={{ background: '#131c2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, width: '100%', maxWidth: 480, padding: 28 }}>
            <h3 style={{ color: '#f1f5f9', fontWeight: 800, margin: '0 0 20px', fontSize: 18 }}>Nuevo término al glosario</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input placeholder="Término *" value={formGlosario.termino} onChange={e => setFormGlosario(p => ({ ...p, termino: e.target.value }))} style={inputStyle} />
              <textarea placeholder="Definición *" value={formGlosario.definicion} onChange={e => setFormGlosario(p => ({ ...p, definicion: e.target.value }))} style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} />
              <input placeholder="Ejemplo (opcional)" value={formGlosario.ejemplo} onChange={e => setFormGlosario(p => ({ ...p, ejemplo: e.target.value }))} style={inputStyle} />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setModalGlosario(false)} style={{ flex: 1, background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '12px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={crearGlosario} style={{ flex: 1, background: 'linear-gradient(135deg,#38bdf8,#7c3aed)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>Agregar término</button>
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
