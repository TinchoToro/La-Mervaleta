// Las reglas son datos del servidor. Nunca se aceptan avances/puntos enviados por alumnos.
const tipos = {
  primera_compra: null, total_operaciones: 'cantidad', diversificacion_activos: 'cantidad',
  diversificacion_sectores: 'cantidad', cedear_en_cartera: 'cantidad', cedears_en_cartera: 'cantidad',
  inversor_completo: null, renta_fija_pct: 'pct_minimo', conceptos_leidos: 'cantidad',
  todos_conceptos: null, superar_promedio_escuela: null, consistencia_semanal: 'semanas',
  manual: null,
};
function validarRegla(valor) {
  let regla = valor;
  if (typeof regla === 'string') {
    try { regla = JSON.parse(regla); } catch { throw new Error('La regla debe ser un JSON válido'); }
  }
  if (!regla || Array.isArray(regla) || !Object.hasOwn(tipos, regla.tipo)) {
    throw new Error('Seleccioná una condición de cumplimiento válida');
  }
  const campo = tipos[regla.tipo];
  const limpia = { tipo: regla.tipo };
  if (campo) {
    const numero = regla[campo];
    if (typeof numero !== 'number' || !Number.isFinite(numero) || numero <= 0 ||
        (campo !== 'pct_minimo' && !Number.isInteger(numero)) || (campo === 'pct_minimo' && numero > 100)) {
      throw new Error(`El valor de ${campo} debe ser positivo${campo === 'pct_minimo' ? ' y no superar 100' : ' y entero'}`);
    }
    limpia[campo] = numero;
  }
  if (regla.antes_de_operar != null) {
    if (regla.tipo !== 'conceptos_leidos' || typeof regla.antes_de_operar !== 'boolean') throw new Error('La condición antes de operar solo aplica a lectura de conceptos');
    limpia.antes_de_operar = regla.antes_de_operar;
  }
  return limpia;
}
const normalizar = texto => String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
function resolverRegla(d) {
  // No reemplazar silenciosamente una regla inválida ya configurada.
  if (d.regla_json != null) return validarRegla(d.regla_json);
  const nombre = normalizar(d.nombre || d.titulo);
  const texto = normalizar(d.descripcion);
  const lectura = texto.match(/^(?:lee|leer|lea)\s+(?:al menos\s+)?(\d+)\s+conceptos(?: del modulo educativo)?(?: antes de operar)?[.!]?$/);
  if (lectura) return validarRegla({ tipo: 'conceptos_leidos', cantidad: Number(lectura[1]), ...(/antes de operar/.test(texto) ? { antes_de_operar: true } : {}) });
  if (/^(?:lee|leer|lea)\s+todos los conceptos(?: del modulo educativo)?[.!]?$/.test(texto)) return { tipo: 'todos_conceptos' };
  if (nombre === 'lector activo' && !texto) return { tipo: 'conceptos_leidos', cantidad: 5 };
  if (nombre === 'primera inversion' && /primera compra/.test(texto)) return { tipo: 'primera_compra' };
  const sectores = texto.match(/(?:al menos\s+)?(\d+)\s+(?:activos de distintos\s+)?sectores/);
  if (sectores && /^(?:tene|tener) al menos \d+ (?:activos de distintos )?sectores[.!]?$/.test(texto)) return { tipo: 'diversificacion_sectores', cantidad: Number(sectores[1]) };
  const activos = texto.match(/al menos\s+(\d+)\s+activos/);
  if (activos && /^(?:tene|tener) al menos \d+ activos(?: (?:distintos|diferentes))?(?: en (?:tu )?cartera)?[.!]?$/.test(texto)) return { tipo: 'diversificacion_activos', cantidad: Number(activos[1]) };
  // Solo inferir consignas simples y explícitas; no reducir una actividad compuesta a un contador.
  const simple = texto.replace(/[.!]$/, '');
  const operaciones = simple.match(/^(?:realiza|realizar|hace|hacer) (?:al menos )?(\d+) operaciones(?: en (?:la plataforma|el simulador))?$/);
  if (operaciones) return { tipo: 'total_operaciones', cantidad: Number(operaciones[1]) };
  const cedears = simple.match(/^(?:tene|tener|mantene|mantener) (?:en (?:tu )?cartera )?(?:al menos )?(\d+) cedears?(?: (?:distintos|diferentes))?(?: en (?:tu )?cartera)?$/);
  if (cedears) return { tipo: 'cedears_en_cartera', cantidad: Number(cedears[1]) };
  if (/^(?:tene|tener) en (?:tu )?cartera al menos un instrumento de cada tipo(?: de activo)?$/.test(simple)) return { tipo: 'inversor_completo' };
  const renta = simple.match(/^(?:tene|tener) (?:en renta fija al menos el |al menos el )(\d+(?:[.,]\d+)?)%(?: de tu cartera en renta fija| de tu cartera)$/);
  if (renta) return validarRegla({ tipo: 'renta_fija_pct', pct_minimo: Number(renta[1].replace(',', '.')) });
  // Actividades abiertas (análisis, reflexiones, etc.) requieren evidencia y evaluación docente.
  return { tipo: 'manual' };
}
function validarDatos({ nombre, titulo, descripcion, puntos_bonus = 300, fecha_inicio, fecha_fin }, conFechas = true) {
  if (!(nombre || titulo)?.trim() || !descripcion?.trim()) throw new Error('Nombre y descripción requeridos');
  if (!Number.isSafeInteger(puntos_bonus) || puntos_bonus < 0) throw new Error('Los puntos deben ser un entero mayor o igual a cero');
  if (conFechas) {
    const fechaValida = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) &&
      !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s;
    if (!fechaValida(fecha_inicio) || !fechaValida(fecha_fin) || fecha_fin < fecha_inicio) {
      throw new Error('Definí fechas válidas: el fin no puede ser anterior al inicio');
    }
  }
}
async function resolverAsignada(client, d) {
  if (d.regla_json != null) return validarRegla(d.regla_json);
  // Recuperar la condición original solo si la correspondencia no es ambigua.
  const { rows } = await client.query('SELECT * FROM banco_desafios WHERE titulo=$1 AND descripcion=$2',[d.nombre,d.descripcion]);
  const candidatas = [];
  for (const b of rows) {
    if (b.regla_json == null) continue;
    try { candidatas.push(validarRegla(b.regla_json)); } catch { /* Se informa como revisión en la regla de la asignación. */ }
  }
  if (candidatas.length && candidatas.every(r => JSON.stringify(r) === JSON.stringify(candidatas[0]))) return candidatas[0];
  return resolverRegla(d);
}
module.exports = { validarRegla, resolverRegla, validarDatos, resolverAsignada };
