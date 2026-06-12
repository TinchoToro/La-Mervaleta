// services/api.js – Cliente HTTP para La Mervaleta
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const request = async (method, endpoint, body = null) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('mervaleta_token') : null;
  const config = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    ...(body && { body: JSON.stringify(body) }),
  };
  const res = await fetch(`${BASE_URL}${endpoint}`, config);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error en la petición');
  return data;
};

const get  = (ep)       => request('GET',  ep);
const post = (ep, body) => request('POST', ep, body);
const put  = (ep, body) => request('PUT',  ep, body);

export const authService = {
  register: (data)  => post('/auth/register', data),
  login:    (data)  => post('/auth/login',    data),
  me:       ()      => get('/auth/me'),
  logout:   ()      => localStorage.removeItem('mervaleta_token'),
  saveToken:(token) => localStorage.setItem('mervaleta_token', token),
  getToken: ()      => localStorage.getItem('mervaleta_token'),
};

export const carteraService = {
  miCartera:    () => get('/cartera'),
  listarActivos:() => get('/cartera/activos'),
};

export const operacionesService = {
  comprar:   (activo_id, cantidad) => post('/comprar',  { activo_id, cantidad }),
  vender:    (activo_id, cantidad) => post('/vender',   { activo_id, cantidad }),
  historial: ()                    => get('/operaciones'),
};

export const rankingService = {
  alumnos:    () => get('/ranking'),
  escuelas:   () => get('/ranking-escuelas'),
  miPosicion: () => get('/ranking/mi-posicion'),
};

export const desafiosService = {
  todos:  () => get('/desafios'),
  actual: () => get('/desafios/actual'),
  crear:  (data) => post('/desafios', data),
};

export const conceptosService = {
  listar:      ()   => get('/conceptos'),
  pendientes:  ()   => get('/conceptos/pendientes'),
  marcarVisto: (id) => post(`/conceptos/${id}/ver`),
};

export const escuelasService = {
  listar: ()     => get('/escuelas'),
  crear:  (data) => post('/escuelas', data),
};

export const docenteService = {
  resumen:       ()   => get('/docente/resumen'),
  alumnos:       ()   => get('/docente/alumnos'),
  detalleAlumno: (id) => get(`/docente/alumnos/${id}`),
};