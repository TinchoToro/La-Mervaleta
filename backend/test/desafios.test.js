const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
const { validarRegla, resolverRegla, validarDatos } = require('../services/reglasDesafios');
const pg = new PGlite();
const adapter = { query: (sql, params) => params ? pg.query(sql, params) : /;/.test(sql) ? pg.exec(sql) : pg.query(sql),
  connect: async () => ({ query: adapter.query, release() {} }) };
require.cache[require.resolve('../config/db')] = { exports: adapter };
const { migrar } = require('../scripts/migrarDesafios');
const { sincronizar, sincronizarEnTransaccion, guardar, resumir, evaluar } = require('../services/desafios');
const controller = require('../controllers/desafiosController');
const banco = require('../controllers/bancoDesafiosController');
const conceptos = require('../controllers/conceptosController');
const operaciones = require('../controllers/operacionesController');
let escuela, otra, alumno, ajeno, docente, temporada;
const q = (sql, args) => pg.query(sql, args);
async function id(sql, args) { return (await q(sql + ' RETURNING id', args)).rows[0].id; }
async function desafio(regla, extra = {}) {
  return id(`INSERT INTO desafios(nombre,descripcion,regla_json,puntos_bonus,fecha_inicio,fecha_fin,escuela_id,temporada_id)
    VALUES ($1,$2,$3,$4,CURRENT_DATE-5,CURRENT_DATE+5,$5,$6)`,
  [extra.nombre || 'Prueba', extra.descripcion || 'Consigna', regla, extra.puntos ?? 150, extra.escuela || escuela, extra.temporada || null]);
}
async function leer(n, usuario = alumno, fecha = new Date()) {
  for (let i=0; i<n; i++) {
    const c = await id("INSERT INTO conceptos(titulo,contenido,nivel,orden) VALUES ('Concepto','Contenido','básico',1)");
    await q('INSERT INTO conceptos_vistos(usuario_id,concepto_id,visto_at) VALUES ($1,$2,$3)', [usuario,c,fecha]);
  }
}
function respuesta() { return { code: 200, body: null, status(n) { this.code=n; return this; }, json(d) { this.body=d; return this; }, set() { return this; } }; }
before(async () => {
  const schema = fs.readFileSync(path.join(__dirname,'../config/schema.sql'),'utf8').replace('CREATE EXTENSION IF NOT EXISTS "pgcrypto";', '');
  await pg.exec(schema);
  await migrar(adapter);
});
after(async () => pg.close());
beforeEach(async () => {
  await pg.exec('TRUNCATE escuelas,usuarios,carteras,temporadas,banco_desafios,desafios,desafios_progreso,actividad_desafios,conceptos,conceptos_vistos,operaciones,posiciones,historial_precios CASCADE');
  await pg.exec("UPDATE activos SET cotizacion_at=NULL,cotizacion_fuente=NULL; UPDATE activos SET precio=100,variacion_dia=0 WHERE ticker='GGAL'");
  escuela = await id("INSERT INTO escuelas(nombre,ciudad) VALUES ('Escuela','Madryn')");
  otra = await id("INSERT INTO escuelas(nombre,ciudad) VALUES ('Otra','Trelew')");
  alumno = await id("INSERT INTO usuarios(nombre,apellido,email,password_hash,rol,escuela_id) VALUES ('Ana','Alumna','a@a','x','alumno',$1)", [escuela]);
  ajeno = await id("INSERT INTO usuarios(nombre,apellido,email,password_hash,rol,escuela_id) VALUES ('Otro','Alumno','b@b','x','alumno',$1)", [otra]);
  docente = await id("INSERT INTO usuarios(nombre,apellido,email,password_hash,rol,escuela_id) VALUES ('Docente','Uno','d@d','x','docente',$1)", [escuela]);
  temporada = await id("INSERT INTO temporadas(escuela_id,activa,fecha_inicio,fecha_fin,nombre) VALUES ($1,TRUE,CURRENT_DATE,CURRENT_DATE+30,'Liga')",[escuela]);
  await q('INSERT INTO carteras(usuario_id,temporada_id,capital_actual) VALUES ($1,$2,1000000),($3,NULL,1000000)',[alumno,temporada,ajeno]);
});
test('valida tipos, cantidades, porcentajes, fechas y preserva cero puntos', () => {
  for (const regla of [null, {}, {tipo:'inventado'}, {tipo:'conceptos_leidos',cantidad:0}, {tipo:'renta_fija_pct',pct_minimo:101}, {tipo:'total_operaciones',cantidad:1.5}]) assert.throws(()=>validarRegla(regla));
  assert.deepEqual(validarRegla('{"tipo":"conceptos_leidos","cantidad":5}'),{tipo:'conceptos_leidos',cantidad:5});
  assert.throws(()=>validarDatos({nombre:'x',descripcion:'x',fecha_inicio:'2026-02-30',fecha_fin:'2026-03-01'}));
  validarDatos({nombre:'x',descripcion:'x',puntos_bonus:0,fecha_inicio:'2026-10-23',fecha_fin:'2026-10-23'});
  assert.equal(resolverRegla({descripcion:'Redactá un análisis del mercado'}).tipo,'manual');
  assert.equal(resolverRegla({descripcion:'Tené al menos 3 activos de distintos sectores'}).tipo,'diversificacion_sectores');
});
test('repara regla NULL, avance parcial, lectura completa y puntaje persistido una sola vez',async()=>{
  const d=await desafio(null,{nombre:'Aprende antes de invertir',descripcion:'Lee al menos 5 conceptos del modulo educativo antes de operar'});
  await leer(4);
  let rows=await sincronizar(alumno);assert.equal(rows[0].completado,false);assert.equal(Number(rows[0].progreso_actual),4);
  await leer(1); rows=await sincronizar(alumno);assert.equal(rows[0].completado,true);assert.equal(Number(rows[0].progreso_pct),100);assert.ok(rows[0].fecha_completado);
  assert.equal(resumir(rows).puntos,150);
  await q('UPDATE desafios SET puntos_bonus=999 WHERE id=$1',[d]);
  rows=await sincronizar(alumno);assert.equal(resumir(rows).puntos,150);
  assert.equal(Number((await q('SELECT COUNT(*) AS cnt FROM desafios_progreso WHERE usuario_id=$1',[alumno])).rows[0].cnt),1);
});
test('todos los conceptos: excluye inactivos y no completa un módulo vacío',async()=>{
  await desafio({tipo:'todos_conceptos'});
  assert.equal((await sincronizar(alumno))[0].completado,false);
  await leer(2);await q("INSERT INTO conceptos(titulo,contenido,nivel,orden,activo) VALUES ('Archivado','x','básico',9,FALSE)");
  assert.equal((await sincronizar(alumno))[0].completado,true);
});
test('lecturas posteriores al vencimiento no acreditan; lecturas anteriores sí y conserva completados vencidos',async()=>{
  const d=await desafio({tipo:'conceptos_leidos',cantidad:1});
  await q('UPDATE desafios SET fecha_inicio=CURRENT_DATE-10,fecha_fin=CURRENT_DATE-2 WHERE id=$1',[d]);
  await leer(1);assert.equal((await sincronizar(alumno))[0].completado,false);
  await leer(1,alumno,new Date(Date.now()-5*86400000));
  const rows=await sincronizar(alumno);assert.equal(rows[0].completado,true);assert.equal(resumir(rows).puntos,150);
  await q('UPDATE desafios SET activo=FALSE WHERE id=$1',[d]);assert.equal((await sincronizar(alumno)).length,1);
});
test('respeta escuela, temporada y fecha de inicio',async()=>{
  await desafio({tipo:'primera_compra'},{escuela:otra});
  const futuro=await desafio({tipo:'primera_compra'});await q('UPDATE desafios SET fecha_inicio=CURRENT_DATE+1 WHERE id=$1',[futuro]);
  const otraTemporada=await id("INSERT INTO temporadas(escuela_id,activa,fecha_inicio,fecha_fin,nombre) VALUES ($1,FALSE,CURRENT_DATE,CURRENT_DATE+30,'Otra')",[escuela]);
  await desafio({tipo:'primera_compra'},{temporada:otraTemporada});
  await desafio({tipo:'primera_compra'},{temporada});
  assert.equal((await sincronizar(alumno)).length,1);
  assert.equal((await sincronizar(ajeno)).length,1);
});
test('upsert con una evaluación atrasada no desmarca ni duplica premios',async()=>{
  const d=await desafio({tipo:'manual'});const datos=(await q('SELECT * FROM desafios WHERE id=$1',[d])).rows[0];
  await guardar(adapter,alumno,datos,{completado:true,progreso:1,objetivo:1},docente,'Evidencia');
  await guardar(adapter,alumno,datos,{completado:false,progreso:0,objetivo:1});
  const p=await guardar(adapter,alumno,datos,{completado:true,progreso:1,objetivo:1},docente,'Reintento');
  assert.equal(p.completado,true);assert.equal(Number(p.progreso_pct),100);assert.equal(p.puntos_otorgados,150);assert.equal(p.observacion_docente,'Evidencia');
});
test('banco: copia regla y asigna escuela/temporada; rechaza fechas y reglas inválidas',async()=>{
  const b=await id(`INSERT INTO banco_desafios(titulo,descripcion,puntos_bonus,regla_json) VALUES ('Educación','Lee todos los conceptos del módulo',500,$1)`,[{tipo:'todos_conceptos'}]);
  const req={usuario:{id:docente,escuela_id:escuela},params:{id:b},body:{fecha_inicio:'2026-01-01',fecha_fin:'2027-01-01'}};let res=respuesta();
  await banco.asignarDesafio(req,res);assert.equal(res.code,201);assert.deepEqual(res.body.desafio.regla_json,{tipo:'todos_conceptos'});assert.equal(res.body.desafio.temporada_id,temporada);assert.equal(res.body.desafio.escuela_id,escuela);
  res=respuesta();await banco.asignarDesafio({...req,body:{fecha_inicio:'2026-02-30',fecha_fin:'2026-01-01'}},res);assert.equal(res.code,400);
  await q('UPDATE banco_desafios SET regla_json=$2 WHERE id=$1',[b,{tipo:'invalido'}]);res=respuesta();await banco.asignarDesafio(req,res);assert.equal(res.code,400);
});
test('validación docente: evidencia obligatoria, escuela protegida y premio idempotente',async()=>{
  const d=await desafio({tipo:'manual'});const req={usuario:{id:docente,rol:'docente',escuela_id:escuela},params:{id:d},body:{alumno_id:alumno,observacion:'Trabajo entregado y revisado'}};
  let res=respuesta();await controller.aprobar({...req,body:{alumno_id:alumno}},res);assert.equal(res.code,400);
  res=respuesta();await controller.aprobar({...req,body:{alumno_id:ajeno,observacion:'Trabajo'}},res);assert.equal(res.code,404);
  for(let i=0;i<2;i++){res=respuesta();await controller.aprobar(req,res);assert.equal(res.code,200);assert.equal(res.body.puntos_otorgados,150);}
});
test('cartera: activos y sectores distintos; CEDEAR y cuatro tipos; porcentaje sin redondeo prematuro',async()=>{
  const cartera=(await q('SELECT id FROM carteras WHERE usuario_id=$1',[alumno])).rows[0].id;
  const defs=[['X1','accion','banco',804],['X2','bono','renta fija',196],['X3','cedear','tecnología',1],['X4','letra','renta fija',1]];
  for(const [ticker,tipo,sector,precio] of defs){const a=await id('INSERT INTO activos(ticker,nombre,tipo,sector,precio) VALUES ($1,$1,$2,$3,$4)',[ticker,tipo,sector,precio]);await q('INSERT INTO posiciones(cartera_id,activo_id,cantidad,precio_promedio) VALUES ($1,$2,1,$3)',[cartera,a,precio]);}
  const base={en_plazo:true,fecha_corte:new Date()};
  for(const regla of [{tipo:'diversificacion_activos',cantidad:4},{tipo:'diversificacion_sectores',cantidad:3},{tipo:'cedears_en_cartera',cantidad:1},{tipo:'inversor_completo'}])assert.equal((await evaluar(adapter,alumno,regla,base)).completado,true);
  assert.equal((await evaluar(adapter,alumno,{tipo:'renta_fija_pct',pct_minimo:20},base)).completado,false);
  assert.equal((await evaluar(adapter,alumno,{tipo:'inversor_completo'},{...base,en_plazo:false})).requiere_revision,true);
});
test('compra, venta y lectura acreditan dentro de la transacción sin visitar Desafíos',async()=>{
  const d=await desafio({tipo:'primera_compra'});await leer(1);
  const activo=(await q("SELECT id FROM activos WHERE ticker='GGAL'")).rows[0].id;
  let res=respuesta();await operaciones.comprar({usuario:{id:alumno},body:{activo_id:activo,cantidad:1}},res);assert.equal(res.code,201);
  assert.equal((await q('SELECT completado FROM desafios_progreso WHERE desafio_id=$1',[d])).rows[0].completado,true);
  const op=await desafio({tipo:'total_operaciones',cantidad:2});res=respuesta();await operaciones.vender({usuario:{id:alumno},body:{activo_id:activo,cantidad:1}},res);assert.equal(res.code,201);
  assert.equal((await q('SELECT completado FROM desafios_progreso WHERE desafio_id=$1',[op])).rows[0].completado,true);
  const lectura=await desafio({tipo:'conceptos_leidos',cantidad:2});
  const c=await id("INSERT INTO conceptos(titulo,contenido,nivel,orden) VALUES ('Nuevo','x','básico',3)");
  res=respuesta();await conceptos.marcarVisto({usuario:{id:alumno},params:{id:c}},res);assert.equal(res.code,200);
  assert.equal((await q('SELECT completado FROM desafios_progreso WHERE desafio_id=$1',[lectura])).rows[0].completado,true);
});
test('consistencia semanal usa varias fechas reales, no una sola ultima_actividad',async()=>{
  const d=await desafio({tipo:'consistencia_semanal',semanas:2});await q('UPDATE desafios SET fecha_inicio=CURRENT_DATE-30 WHERE id=$1',[d]);
  await q('INSERT INTO actividad_desafios(usuario_id,dia) VALUES ($1,CURRENT_DATE-14),($1,CURRENT_DATE-7)',[alumno]);
  assert.equal((await sincronizar(alumno))[0].completado,true);
});
test('migración reejecutable conserva avances del esquema antiguo y acredita premios ya completados',async()=>{
  const d=await desafio({tipo:'manual'},{puntos:500});
  await q('INSERT INTO desafios_progreso(usuario_id,desafio_id,completado,completado_at) VALUES ($1,$2,TRUE,NOW())',[alumno,d]);
  // Ejecución directa prueba idempotencia del SQL además del marcador de migraciones.
  await pg.exec(fs.readFileSync(path.join(__dirname,'../migrations/001_desafios.sql'),'utf8'));
  await migrar(adapter);
  const p=(await q('SELECT * FROM desafios_progreso WHERE desafio_id=$1',[d])).rows[0];assert.equal(p.puntos_otorgados,500);assert.ok(p.fecha_completado);assert.equal(Number(p.progreso_pct),100);
});

test('comprar no produce pérdida ficticia: patrimonio suma efectivo y activos; al subir el precio cambia el rendimiento y ranking',async()=>{
  await q('UPDATE carteras SET capital_inicial=1000,capital_actual=1000 WHERE usuario_id=$1',[alumno]);
  await leer(1);
  const activo=(await q("SELECT id FROM activos WHERE ticker='GGAL'")).rows[0].id;
  const r=respuesta();await operaciones.comprar({usuario:{id:alumno},body:{activo_id:activo,cantidad:5}},r);assert.equal(r.code,201);
  let valor=(await q('SELECT * FROM v_carteras_valorizadas WHERE usuario_id=$1',[alumno])).rows[0];
  assert.equal(Number(valor.capital_actual),500);assert.equal(Number(valor.patrimonio_total),1000);assert.equal(Number(valor.rendimiento_pct),0);
  await q('UPDATE activos SET precio=110 WHERE id=$1',[activo]);
  valor=(await q('SELECT * FROM v_carteras_valorizadas WHERE usuario_id=$1',[alumno])).rows[0];assert.equal(Number(valor.patrimonio_total),1050);assert.equal(Number(valor.rendimiento_pct),5);
  const rank=(await q('SELECT * FROM v_ranking_patrimonio_alumnos WHERE id=$1',[alumno])).rows[0];assert.equal(Number(rank.capital_actual),1050);assert.equal(Number(rank.rendimiento_pct),5);
});
test('cotizaciones: valida moneda, nominal, fecha, duplicados y no inventa variación',()=>{
  const {validarCotizaciones}=require('../services/mercado');
  const c={ticker:'GGAL',precio:100,moneda:'ARS',unidad_nominal:1,fecha:new Date(Date.now()-1000).toISOString()};
  assert.equal(validarCotizaciones({cotizaciones:[c]})[0].variacion,null);
  assert.equal(validarCotizaciones({cotizaciones:[{...c,precio:110,cierre_anterior:100}]})[0].variacion,10);
  for(const cambio of [{moneda:'USD'},{unidad_nominal:100},{precio:-1},{precio:NaN},{fecha:'2026-10-01'},{fecha:new Date(Date.now()+86400000).toISOString()}])assert.throws(()=>validarCotizaciones({cotizaciones:[{...c,...cambio}]}));
  assert.throws(()=>validarCotizaciones({cotizaciones:[c,c]}));
});
test('precios con fuente: persiste metadatos e historial; no retrocede ante una cotización anterior',async()=>{
  const {guardarCotizaciones}=require('../services/mercado');
  const ahora=new Date(Date.now()-1000);
  let r=await guardarCotizaciones(adapter,[{ticker:'GGAL',precio:105,variacion:5,fecha:ahora}],'Proveedor de prueba');assert.equal(r.actualizados,1);
  r=await guardarCotizaciones(adapter,[{ticker:'GGAL',precio:1,variacion:-99,fecha:new Date(ahora.getTime()-10000)}],'Proveedor de prueba');assert.equal(r.actualizados,0);
  const activo=(await q("SELECT * FROM activos WHERE ticker='GGAL'")).rows[0];assert.equal(Number(activo.precio),105);assert.equal(activo.cotizacion_fuente,'Proveedor de prueba');
  assert.equal((await q('SELECT fuente FROM historial_precios WHERE activo_id=$1',[activo.id])).rows[0].fuente,'Proveedor de prueba');
});
test('actualizador conserva precios si la fuente falla y no genera un mercado simulado',async()=>{
  const {actualizarMercado}=require('../services/mercado');
  const originalFetch=global.fetch;
  const anterior={url:process.env.MARKET_DATA_URL,fuente:process.env.MARKET_DATA_SOURCE};
  process.env.MARKET_DATA_URL='https://proveedor.example/cotizaciones';process.env.MARKET_DATA_SOURCE='Prueba';
  try {
    global.fetch=async()=>({ok:true,json:async()=>({cotizaciones:[{ticker:'GGAL',precio:120,variacion_pct:20,fecha:new Date(Date.now()-1000).toISOString(),moneda:'ARS',unidad_nominal:1}]})});
    assert.equal((await actualizarMercado()).actualizados,1);
    global.fetch=async()=>({ok:false,status:503});
    await assert.rejects(actualizarMercado());
    assert.equal(Number((await q("SELECT precio FROM activos WHERE ticker='GGAL'")).rows[0].precio),120);
    assert.equal((await q('SELECT estado FROM estado_mercado WHERE id=1')).rows[0].estado,'error');
  } finally {
    global.fetch=originalFetch;
    for(const [clave,valor] of [['MARKET_DATA_URL',anterior.url],['MARKET_DATA_SOURCE',anterior.fuente]]) { if(valor==null) delete process.env[clave]; else process.env[clave]=valor; }
  }
});
test('cron sin secreto configurado o con clave en query no autoriza actualizaciones',()=>{
  const {autorizarCron}=require('../controllers/preciosController');const previo=process.env.CRON_SECRET;
  try { delete process.env.CRON_SECRET;assert.equal(autorizarCron({headers:{},query:{}}),false);
    process.env.CRON_SECRET='secreto-de-prueba';assert.equal(autorizarCron({headers:{},query:{secret:'secreto-de-prueba'}}),false);
    assert.equal(autorizarCron({headers:{authorization:'Bearer secreto-de-prueba'}}),true);
  }finally{if(previo==null)delete process.env.CRON_SECRET;else process.env.CRON_SECRET=previo;}
});
test('cantidades fraccionarias o inválidas se rechazan sin modificar el dinero',async()=>{
  const activo=(await q("SELECT id FROM activos WHERE ticker='GGAL'")).rows[0].id;
  for(const cantidad of [0,-1,0.5,'2',null,2147483648]){const r=respuesta();await operaciones.comprar({usuario:{id:alumno},body:{activo_id:activo,cantidad}},r);assert.equal(r.code,400);}
  assert.equal(Number((await q('SELECT capital_actual FROM carteras WHERE usuario_id=$1',[alumno])).rows[0].capital_actual),1000000);
});
test('cotización vencida y precio cambiado no ejecutan órdenes',async()=>{
  const activo=(await q("SELECT id FROM activos WHERE ticker='GGAL'")).rows[0].id;
  await leer(1);
  let r=respuesta();await operaciones.comprar({usuario:{id:alumno},body:{activo_id:activo,cantidad:1,precio_esperado:99}},r);assert.equal(r.code,409);
  const previo=process.env.MARKET_DATA_URL;process.env.MARKET_DATA_URL='https://proveedor.example';
  try{r=respuesta();await operaciones.comprar({usuario:{id:alumno},body:{activo_id:activo,cantidad:1}},r);assert.equal(r.code,503);}
  finally{if(previo==null)delete process.env.MARKET_DATA_URL;else process.env.MARKET_DATA_URL=previo;}
  assert.equal(Number((await q('SELECT COUNT(*) AS cnt FROM operaciones')).rows[0].cnt),0);
});
test('historial entrega los últimos registros en orden ascendente y excluye simulaciones sin fuente',async()=>{
  const activo=(await q("SELECT id FROM activos WHERE ticker='GGAL'")).rows[0].id;
  for(let i=10;i>0;i--)await q('INSERT INTO historial_precios(activo_id,precio,fecha,fuente) VALUES($1,$2,CURRENT_DATE-$3::integer,$4)',[activo,100+i,i,i===1?null:'Prueba']);
  const {historialActivo}=require('../controllers/historialController');const r=respuesta();
  await historialActivo({params:{ticker:'GGAL'},query:{dias:3}},r);assert.equal(r.code,200);assert.deepEqual(r.body.map(x=>Number(x.precio)),[104,103,102]);
  const invalida=respuesta();await historialActivo({params:{ticker:'GGAL'},query:{dias:'-2'}},invalida);assert.equal(invalida.code,400);
});
test('SMA y RSI no inventan datos cuando falta historial',async()=>{
  const {indicadores}=await import('../../frontend/utils/indicadores.mjs');
  assert.deepEqual(indicadores([100,101]),{sma20:null,sma50:null,rsi:null});
  const sube=indicadores(Array.from({length:50},(_,i)=>i+1));assert.equal(sube.sma20,40.5);assert.equal(sube.sma50,25.5);assert.equal(sube.rsi,100);
  assert.equal(indicadores(Array(15).fill(100)).rsi,50);
  assert.equal(indicadores(Array.from({length:15},(_,i)=>100-i)).rsi,0);
});
test('un JWT de un usuario suspendido no funciona y se usan sus permisos actuales',async()=>{
  const jwt=require('jsonwebtoken');const {verificarToken}=require('../middleware/auth');const previo=process.env.JWT_SECRET;process.env.JWT_SECRET='secreto-jwt-prueba';
  try{
    const token=jwt.sign({id:alumno,rol:'admin',escuela_id:otra},process.env.JWT_SECRET);
    const req={headers:{authorization:`Bearer ${token}`}};let next=false;
    await verificarToken(req,respuesta(),()=>{next=true;});assert.equal(next,true);assert.equal(req.usuario.rol,'alumno');assert.equal(req.usuario.escuela_id,escuela);
    await q('UPDATE usuarios SET activo=FALSE WHERE id=$1',[alumno]);const r=respuesta();await verificarToken(req,r,()=>assert.fail('No debe autorizar'));assert.equal(r.code,401);
  }finally{if(previo==null)delete process.env.JWT_SECRET;else process.env.JWT_SECRET=previo;}
});
test('docente no puede resetear la cartera ni activar una temporada de otra escuela',async()=>{
  const {resetearCartera}=require('../controllers/adminController');const {activarTemporada}=require('../controllers/temporadasController');
  let r=respuesta();await resetearCartera({usuario:{id:docente,rol:'docente',escuela_id:escuela},params:{id:ajeno}},r);assert.equal(r.code,404);
  const t=await id("INSERT INTO temporadas(nombre,escuela_id,fecha_inicio,fecha_fin) VALUES('Ajena',$1,CURRENT_DATE,CURRENT_DATE+10)",[otra]);
  r=respuesta();await activarTemporada({usuario:{id:docente,rol:'docente',escuela_id:escuela},params:{id:t}},r);assert.equal(r.code,404);
  assert.equal((await q('SELECT activa FROM temporadas WHERE id=$1',[temporada])).rows[0].activa,true);
});
test('leer conceptos después de operar no cumple una consigna que exigía leer antes',async()=>{
  await desafio({tipo:'conceptos_leidos',cantidad:2,antes_de_operar:true});
  await leer(1,alumno,new Date(Date.now()-100000));
  const activo=(await q("SELECT id FROM activos WHERE ticker='GGAL'")).rows[0].id;
  await q("INSERT INTO operaciones(usuario_id,activo_id,tipo,cantidad,precio,fecha) VALUES($1,$2,'compra',1,100,NOW()-INTERVAL '1 minute')",[alumno,activo]);
  await leer(1);
  const d=(await sincronizar(alumno))[0];assert.equal(d.completado,false);assert.equal(Number(d.progreso_actual),1);
});
test('registro crea usuario y cartera con el capital de la temporada en una transacción',async()=>{
  const {register}=require('../controllers/authController');const previo=process.env.JWT_SECRET;process.env.JWT_SECRET='registro-prueba';
  try{
    await q('UPDATE temporadas SET capital_inicial=750000 WHERE id=$1',[temporada]);
    const r=respuesta();await register({body:{nombre:'Nueva',apellido:'Alumna',email:'Nueva@Escuela.edu',password:'contrasena-prueba',escuela_id:escuela}},r);
    assert.equal(r.code,201);assert.equal(r.body.usuario.rol,'alumno');
    const cartera=(await q('SELECT capital_actual FROM carteras WHERE usuario_id=$1',[r.body.usuario.id])).rows[0];assert.equal(Number(cartera.capital_actual),750000);
    const repetida=respuesta();await register({body:{nombre:'Nueva',apellido:'Alumna',email:'nueva@escuela.edu',password:'contrasena-prueba',escuela_id:escuela}},repetida);assert.equal(repetida.code,409);
  }finally{if(previo==null)delete process.env.JWT_SECRET;else process.env.JWT_SECRET=previo;}
});
test('API de cartera y trazabilidad usan esquema migrado y devuelven progreso y puntaje',async()=>{
  const {miCartera}=require('../controllers/carteraController');const {miProgreso}=require('../controllers/trazabilidadController');
  await desafio({tipo:'conceptos_leidos',cantidad:1});await leer(1);
  let r=respuesta();await miCartera({usuario:{id:alumno}},r);assert.equal(r.code,200);assert.ok(r.body.patrimonio_total);assert.ok(Array.isArray(r.body.posiciones));
  r=respuesta();await miProgreso({usuario:{id:alumno}},r);assert.equal(r.code,200);assert.equal(r.body.resumen_desafios.puntos,150);assert.equal(r.body.totales_por_nivel.basico.leidos,1);
});
test('recupera una regla perdida desde el banco cuando nombre y descripción coinciden',async()=>{
  const regla={tipo:'total_operaciones',cantidad:7};
  await q('INSERT INTO banco_desafios(titulo,descripcion,puntos_bonus,regla_json) VALUES($1,$2,100,$3)',['Mi desafío','Practicá las operaciones',regla]);
  const d=await desafio(null,{nombre:'Mi desafío',descripcion:'Practicá las operaciones'});
  const datos=await sincronizar(alumno);assert.deepEqual(datos[0].regla_json,regla);assert.equal(Number(datos[0].progreso_objetivo),7);
  assert.deepEqual((await q('SELECT regla_json FROM desafios WHERE id=$1',[d])).rows[0].regla_json,regla);
});
