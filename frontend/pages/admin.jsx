// pages/admin.jsx – Panel de administración completo
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import { authService, escuelasService } from '../services/api';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.1.137:4000/api';

const get  = (ep) => fetch(`${API}${ep}`, { headers: { Authorization: `Bearer ${localStorage.getItem('mervaleta_token')}` } }).then(r => r.json());
const post = (ep, body) => fetch(`${API}${ep}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('mervaleta_token')}` }, body: JSON.stringify(body) }).then(r => r.json());
const put  = (ep, body) => fetch(`${API}${ep}`, { method: 'PUT',  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('mervaleta_token')}` }, body: JSON.stringify(body) }).then(r => r.json());
const del  = (ep) => fetch(`${API}${ep}`, { method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('mervaleta_token')}` } }).then(r => r.json());

const ROL_COLOR = {
  admin:   { color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)' },
  docente: { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.3)'  },
  alumno:  { color: '#34d399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.3)'  },
  escuela: { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.3)'  },
};

export default function Admin() {
  const router = useRouter();
  const { usuario, cargando, logout } = useAuth();
  const [tab, setTab]           = useState('usuarios');
  const [usuarios, setUsuarios] = useState([]);
  const [escuelas, setEscuelas] = useState([]);
  const [stats, setStats]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [modalUser, setModalUser] = useState(null);
  const [modalEscuela, setModalEscuela] = useState(null);
  const [formEscuela, setFormEscuela] = useState({ nombre: '', ciudad: '', provincia: 'Chubut' });
  const [msg, setMsg]           = useState(null);

  useEffect(() => {
    if (!cargando && !usuario) { router.push('/login'); return; }
    if (!cargando && usuario && usuario.rol !== 'admin') { router.push('/dashboard'); return; }
    if (!usuario) return;
    cargarTodo();
  }, [usuario, cargando]);

  const cargarTodo = async () => {
    setLoading(true);
    try {
      const [u, e, s] = await Promise.all([
        get('/admin/usuarios'),
        get('/escuelas'),
        get('/admin/stats'),
      ]);
      setUsuarios(Array.isArray(u) ? u : []);
      setEscuelas(Array.isArray(e) ? e : []);
      setStats(s);
    } catch {}
    setLoading(false);
  };

  const cambiarRol = async (id, rol) => {
    await put(`/admin/usuarios/${id}/rol`, { rol });
    setUsuarios(prev => prev.map(u => u.id === id ? { ...u, rol } : u));
    setMsg({ tipo: 'ok', texto: 'Rol actualizado' });
    setTimeout(() => setMsg(null), 2000);
  };

  const toggleActivo = async (id, activo) => {
    await put(`/admin/usuarios/${id}/activo`, { activo: !activo });
    setUsuarios(prev => prev.map(u => u.id === id ? { ...u, activo: !activo } : u));
    setMsg({ tipo: 'ok', texto: activo ? 'Usuario desactivado' : 'Usuario activado' });
    setTimeout(() => setMsg(null), 2000);
  };

  const resetearCartera = async (id, nombre) => {
    if (!confirm(`¿Resetear la cartera de ${nombre}? Perderá todas sus posiciones.`)) return;
    await post(`/admin/usuarios/${id}/resetear-cartera`, {});
    setMsg({ tipo: 'ok', texto: `Cartera de ${nombre} reseteada` });
    setTimeout(() => setMsg(null), 2000);
  };

  const crearEscuela = async () => {
    if (!formEscuela.nombre || !formEscuela.ciudad) { setMsg({ tipo: 'error', texto: 'Completá nombre y ciudad' }); return; }
    await post('/escuelas', formEscuela);
    setFormEscuela({ nombre: '', ciudad: '', provincia: 'Chubut' });
    setModalEscuela(null);
    await cargarTodo();
    setMsg({ tipo: 'ok', texto: 'Escuela creada' });
    setTimeout(() => setMsg(null), 2000);
  };

  const usuariosFiltrados = usuarios.filter(u =>
    `${u.nombre} ${u.apellido} ${u.email}`.toLowerCase().includes(busqueda.toLowerCase())
  );

  if (cargando || loading) return <Spinner />;

  const s = {
    page: { minHeight: '100vh', background: '#0b1120', fontFamily: 'system-ui,-apple-system,sans-serif', color: '#e2e8f0' },
    card: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14 },
    input: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '9px 12px', fontSize: 13, color: '#e2e8f0', outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' },
    btn: (color) => ({ background: color, color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }),
  };

  return (
    <div style={s.page}>
      {/* Nav */}
      <nav style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#dc2626,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>⚙</div>
        <span style={{ fontWeight: 800, fontSize: 15 }}>Panel Admin</span>
        <span style={{ fontSize: 11, color: '#475569', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 20 }}>La Mervaleta</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
          <Link href="/dashboard" style={{ fontSize: 12, color: '#64748b', textDecoration: 'none' }}>← Dashboard</Link>
<Link href="/temporadas" style={{ fontSize: 12, color: '#c084fc', textDecoration: 'none', fontWeight: 600 }}>📅 Temporadas</Link>
<Link href="/banco-desafios" style={{ fontSize: 12, color: '#fbbf24', textDecoration: 'none', fontWeight: 600 }}>🎯 Desafios</Link>
          <button onClick={logout} style={{ fontSize: 11, padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#64748b', cursor: 'pointer' }}>Salir</button>
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Mensaje */}
        {msg && (
          <div style={{ borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 600,
            background: msg.tipo === 'ok' ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
            border: `1px solid ${msg.tipo === 'ok' ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)'}`,
            color: msg.tipo === 'ok' ? '#34d399' : '#f87171' }}>
            {msg.texto}
          </div>
        )}

        {/* Stats generales */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
            {[
              { label: 'Total usuarios', valor: stats.total_usuarios, color: '#60a5fa' },
              { label: 'Alumnos activos', valor: stats.total_alumnos, color: '#34d399' },
              { label: 'Docentes', valor: stats.total_docentes, color: '#fbbf24' },
              { label: 'Escuelas', valor: stats.total_escuelas, color: '#c084fc' },
              { label: 'Operaciones totales', valor: stats.total_operaciones, color: '#f87171' },
              { label: 'Rendimiento promedio', valor: `${stats.rendimiento_promedio || 0}%`, color: stats.rendimiento_promedio >= 0 ? '#34d399' : '#f87171' },
            ].map(st => (
              <div key={st.label} style={{ ...s.card, padding: '16px 18px' }}>
                <div style={{ fontSize: 26, fontWeight: 900, color: st.color }}>{st.valor}</div>
                <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{st.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 4 }}>
          {[['usuarios','Usuarios'], ['escuelas','Escuelas']].map(([val, label]) => (
            <button key={val} onClick={() => setTab(val)}
              style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                background: tab === val ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: tab === val ? '#f1f5f9' : '#475569' }}>
              {label}
              {val === 'usuarios' && <span style={{ marginLeft: 6, fontSize: 11, color: '#475569' }}>({usuarios.length})</span>}
            </button>
          ))}
        </div>

        {/* ── USUARIOS ── */}
        {tab === 'usuarios' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o email..." style={s.input} />

            <div style={{ ...s.card, overflow: 'hidden' }}>
              {usuariosFiltrados.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#475569' }}>No hay usuarios.</div>
              ) : usuariosFiltrados.map((u, i) => {
                const rolCfg = ROL_COLOR[u.rol] || ROL_COLOR.alumno;
                return (
                  <div key={u.id} style={{ padding: '14px 20px', borderBottom: i < usuariosFiltrados.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', opacity: u.activo ? 1 : 0.45 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      {/* Avatar */}
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#059669,#0284c7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#fff', flexShrink: 0 }}>
                        {u.nombre?.charAt(0)}{u.apellido?.charAt(0)}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: 14, color: '#e2e8f0' }}>{u.nombre} {u.apellido}</span>
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 700, background: rolCfg.bg, color: rolCfg.color, border: `1px solid ${rolCfg.border}` }}>{u.rol}</span>
                          {!u.activo && <span style={{ fontSize: 11, color: '#475569', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 20 }}>Desactivado</span>}
                        </div>
                        <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>{u.email} {u.escuela_nombre ? `· ${u.escuela_nombre}` : ''} {u.anio_cursada ? `· ${u.anio_cursada}` : ''}</div>
                      </div>

                      {/* Acciones */}
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0 }}>
                        {/* Cambiar rol */}
                        <select value={u.rol} onChange={e => cambiarRol(u.id, e.target.value)}
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '5px 8px', fontSize: 11, color: '#e2e8f0', cursor: 'pointer', fontFamily: 'inherit' }}>
                          <option value="alumno">alumno</option>
                          <option value="docente">docente</option>
                          <option value="admin">admin</option>
                        </select>

                        {/* Activar/desactivar */}
                        <button onClick={() => toggleActivo(u.id, u.activo)}
                          style={s.btn(u.activo ? 'rgba(248,113,113,0.2)' : 'rgba(52,211,153,0.2)')}>
                          <span style={{ color: u.activo ? '#f87171' : '#34d399' }}>{u.activo ? 'Desactivar' : 'Activar'}</span>
                        </button>

                        {/* Resetear cartera */}
                        {u.rol === 'alumno' && (
                          <button onClick={() => resetearCartera(u.id, `${u.nombre} ${u.apellido}`)}
                            style={s.btn('rgba(251,191,36,0.15)')}>
                            <span style={{ color: '#fbbf24' }}>Resetear cartera</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── ESCUELAS ── */}
        {tab === 'escuelas' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button onClick={() => setModalEscuela(true)}
              style={{ alignSelf: 'flex-start', background: 'linear-gradient(135deg,#059669,#0284c7)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              + Nueva escuela
            </button>

            <div style={{ ...s.card, overflow: 'hidden' }}>
              {escuelas.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#475569' }}>No hay escuelas registradas.</div>
              ) : escuelas.map((e, i) => (
                <div key={e.id} style={{ padding: '16px 20px', borderBottom: i < escuelas.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#e2e8f0' }}>{e.nombre}</div>
                    <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>{e.ciudad} · {e.provincia}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      {usuarios.filter(u => u.escuela_id === e.id).length} usuarios
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal nueva escuela */}
      {modalEscuela && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div style={{ background: '#131c2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, width: '100%', maxWidth: 400, padding: 24 }}>
            <h3 style={{ color: '#f1f5f9', fontWeight: 800, margin: '0 0 20px', fontSize: 18 }}>Nueva escuela</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input placeholder="Nombre de la escuela *" value={formEscuela.nombre}
                onChange={e => setFormEscuela(p => ({ ...p, nombre: e.target.value }))} style={s.input} />
              <input placeholder="Ciudad *" value={formEscuela.ciudad}
                onChange={e => setFormEscuela(p => ({ ...p, ciudad: e.target.value }))} style={s.input} />
              <input placeholder="Provincia" value={formEscuela.provincia}
                onChange={e => setFormEscuela(p => ({ ...p, provincia: e.target.value }))} style={s.input} />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setModalEscuela(null)}
                style={{ flex: 1, background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '11px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={crearEscuela}
                style={{ flex: 1, background: 'linear-gradient(135deg,#059669,#0284c7)', color: '#fff', border: 'none', borderRadius: 10, padding: '11px', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
                Crear escuela
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
