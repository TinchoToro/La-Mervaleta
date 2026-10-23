# La Mervaleta: revisión y correcciones

Fecha: 23 de octubre de 2026. Código revisado: `TinchoToro/La-Mervaleta`, commit de origen `b224912`.

## Estado de la entrega

Los cambios están preparados en una copia del repositorio. No están publicados en GitHub, Railway ni Vercel. Se tuvo acceso de lectura al repositorio público; no se tuvo acceso a la configuración, los registros ni los datos de producción de Railway.

La revisión cubrió los flujos de desafíos, puntaje, lecturas, operaciones, precios, cartera, ranking, panel docente, acceso y esquema de base de datos. Las pruebas detectan regresiones concretas; no equivalen a una garantía de ausencia de cualquier error en producción.

## Qué ocurría y qué se cambió

| Área | Problema encontrado en el código | Corrección preparada |
|---|---|---|
| Asignación de desafíos | Se copiaba la consigna sin `regla_json`. | Se guarda la regla junto con escuela, temporada y origen del banco. Al asignar, el docente puede elegir una condición sin escribir JSON. |
| Progreso | El controlador usaba columnas ausentes del esquema inicial. | Migraciones compatibles agregan los campos y conservan los completados existentes. |
| Puntaje | Se calculaba en la pantalla desde el valor actual del desafío. | Cada alumno guarda un premio único en `puntos_otorgados`. Reintentos o evaluaciones atrasadas no desmarcan un completado ni vuelven a sumar puntos. No se transforma el puntaje en dinero de inversión. |
| Barra de progreso | Solo se validaba al visitar Desafíos y desaparecían completados vencidos. | Lecturas, compras y ventas actualizan el estado en la misma transacción. Resumen en Dashboard, Academia y Mi Progreso; actualización periódica de pantallas y conservación de logros vencidos. |
| Asignaciones anteriores | Algunas reglas estaban en NULL, otras ya estaban configuradas. | Recuperación desde el banco si la coincidencia de nombre y descripción es inequívoca; reglas reconocibles para consignas simples. Se preservan reglas explícitas. |
| Actividades abiertas | Un texto libre no contiene una condición automáticamente verificable. | Pantalla de revisión docente: evidencia escrita, persona que aprobó, fecha, estado y puntos persistidos. Una regla desconocida no se da por cumplida por adivinación. |
| Lectura completa | Se contaban conceptos inactivos y un módulo vacío podía completarse. | Se cuentan conceptos activos distintos; se evita completar un módulo vacío. Las consignas de leer antes de operar admiten esa condición explícita. |
| Hábitos | Se pretendía contar semanas desde un único campo de última actividad. | Registro diario de actividad y conteo de semanas con evidencia. No se inventan días de acceso pasados. |
| Actualizador de precios | El endpoint usaba variaciones aleatorias. El script Python intentaba un recurso web de BYMA, apuntaba a una base local y también inventaba precios cuando fallaba. | Se retira la simulación automática encubierta y la contraseña incrustada. Nuevo actualizador HTTPS con contrato de datos, metadatos, control de errores y conservación del último precio. |
| Precio y porcentaje | Se confundían cotización, variación diaria y rendimiento del alumno. | Se separan esas magnitudes. La variación viene de la fuente o se calcula contra un cierre anterior informado. Si falta, se muestra como desconocida. |
| Cartera | Comprar reducía el efectivo y se interpretaba como pérdida de inversión. | `patrimonio_total = efectivo + valor actual de posiciones`. Cartera, ranking, informes y paneles usan esa valoración. El efectivo sigue siendo la cantidad disponible para operar. |
| Gráficos | Las velas dibujaban máximos y mínimos aleatorios. Se mostraban medias y ratios fijos sin datos suficientes. | Serie de precios registrados con fuente. No se inventa OHLC. SMA y RSI solo aparecen con suficientes observaciones; se retiran ratios y medidores financieros inventados. |
| Historial | Se devolvían los registros más antiguos, no los últimos solicitados. | Se seleccionan los últimos N y se ordenan cronológicamente. Los registros previos sin fuente se conservan, pero no se presentan como una serie verificada. |
| Operaciones | Se aceptaban cantidades sin validar suficientemente y el precio mostrado podía cambiar antes de confirmar. | Cantidades enteras positivas, comprobación de precio esperado, bloqueo de cotizaciones antiguas cuando hay proveedor configurado y ejecución transaccional. |
| Permisos | Se podían conservar permisos revocados durante la vida del JWT. Había acciones docentes sin filtro de escuela. | Roles y escuela se consultan en la base. Se bloquea a usuarios inactivos y se restringen reinicios, temporadas e informes a su escuela. |
| Registro y esquema | Usuario y cartera podían quedar separados si había un error; faltaban tablas/campos usados por la app. | Registro transaccional con capital de la temporada y migraciones del esquema faltante. |
| Dependencias | El análisis de dependencias informó vulnerabilidades en las versiones instaladas. | Actualización de dependencias, Next.js y paquetes transitivos; comprobación mediante auditoría y compilación. Node.js 22 recomendado. |

## Qué falta para usar cotizaciones reales

**Esta entrega no incluye una suscripción de datos ni una cuenta de proveedor conectada.** El repositorio no contiene una integración operativa verificable con un servicio real de acciones, bonos, CEDEAR y letras. Tampoco se verificó si existe un cron configurado fuera del repositorio en Railway.

El actualizador nuevo acepta una fuente HTTPS que entregue el contrato de abajo. Un proveedor que use otro formato necesita un adaptador que traduzca sus campos a ese contrato. No sirve pegar una página web de cotizaciones ni la URL antigua de BYMA: deben verificarse autenticación, cobertura, moneda, símbolo, plazo de liquidación, nominal y fecha.

La integración con un proveedor específico y su prueba en vivo quedan pendientes de contar con ese acceso y su documentación. Las pruebas del actualizador usan respuestas de prueba y fallos controlados, no una cuenta bursátil real. La aplicación solo debe consultar datos: las compras y ventas de alumnos siguen siendo operaciones educativas en PostgreSQL.

Fuentes oficiales consultadas para distinguir una web pública de un servicio de datos:

- BYMA, APIs de Market Data: https://www.byma.com.ar/productos/productos-de-datos/market-data/apis
- IOL, requisitos y documentación: https://www.invertironline.com/api y https://api.invertironline.com/

### Contrato del adaptador HTTPS

```json
{
  "cotizaciones": [
    {
      "ticker": "GGAL",
      "precio": 110.25,
      "variacion_pct": 2.75,
      "moneda": "ARS",
      "unidad_nominal": 1,
      "fecha": "2026-10-23T15:30:00-03:00"
    }
  ]
}
```

Los valores del ejemplo son de prueba. `precio` es el precio de una unidad de la cantidad usada por la app. En bonos puede hacer falta convertir una cotización por 100 nominales; **no se aplica un factor a ciegas**. Un ticker genérico como `LECAP` no identifica por sí solo una letra con vencimiento concreto: hay que mapear instrumentos reales antes de habilitarlos con datos de mercado.

`variacion_pct` es opcional. Puede proporcionarse `cierre_anterior` para calcularla. Si faltan ambos, queda desconocida; no se sustituye por cero. Una fecha vieja no reemplaza una más reciente. Monedas diferentes, nominales sin normalizar, precios inválidos y fechas futuras se rechazan.

### Variables del backend en Railway

| Variable | Uso |
|---|---|
| `DATABASE_URL` | Conexión PostgreSQL existente. |
| `JWT_SECRET` | Secreto existente de sesiones. |
| `MARKET_DATA_URL` | Endpoint HTTPS del adaptador de cotizaciones. |
| `MARKET_DATA_SOURCE` | Nombre de la fuente que se mostrará al alumno. |
| `MARKET_DATA_TOKEN` | Bearer para ese endpoint, si lo necesita. Solo en Railway. |
| `MARKET_UPDATE_SECONDS` | Intervalo, 300 segundos por defecto, mínimo 60. Ajustar a la frecuencia y cuota del proveedor. |
| `MARKET_MAX_AGE_SECONDS` | Antigüedad máxima para operar cuando hay proveedor, 86.400 segundos por defecto. Revisar cómo tratar cierres, fines de semana y feriados según la fuente. |
| `CRON_SECRET` | Clave propia solo si se usa cron externo. Se envía en `Authorization: Bearer`, no en la URL. |

El backend hace una consulta al iniciar y luego según el intervalo configurado. Varias réplicas no ejecutan simultáneamente una misma actualización. Si se prefiere cron externo, puede disparar `POST /api/precios/actualizar` con el Bearer. No es necesario usar simultáneamente ambos métodos de programación.

Si faltan URL o fuente, la aplicación informa que no hay actualización verificada y conserva los precios cargados. Si el proveedor falla, no se generan valores aleatorios para simular movimiento. Una consulta exitosa tampoco garantiza que todos los instrumentos hayan cotizado: cada activo muestra su propia fuente y fecha.

## Aplicar la actualización

1. Hacer una copia de respaldo de PostgreSQL antes de aplicar las migraciones y conservar la versión anterior del código.
2. Subir los archivos corregidos a una rama del repositorio. El ZIP de cambios conserva las rutas originales: `backend`, `frontend`, `actualizar_precios.py` y documentación. No subir el ZIP como un archivo dentro del proyecto: hay que extraerlo y aplicar su contenido.
3. Configurar Node.js 22 en Railway y Vercel. El frontend usa Next.js 16.4.3, mantiene Pages Router y React 18, y compila con webpack. React 18 tiene una advertencia de deprecación para futuras versiones de Next, pero está soportado por la versión usada.
4. Desplegar el backend desde la carpeta `backend`. El arranque aplica las migraciones una sola vez bajo una transacción antes de aceptar solicitudes. No ejecutar `schema.sql` sobre una base existente.
5. Para reevaluar de una vez a todos los alumnos activos, ejecutar desde el backend con la conexión de Railway:

   ```bash
   npm run db:repair-challenges
   ```

   El comando recupera reglas reconocibles y emite un informe de las que requieren revisión. Cada alumno también se actualiza al ingresar o abrir su progreso.

6. Desplegar el frontend desde `frontend`, conservando `NEXT_PUBLIC_API_URL=https://TU-BACKEND/api`. Esta variable debe estar disponible al compilar en Vercel. La falta de configuración no se arregla cambiando PostgreSQL.
7. Probar con un alumno real que ya tenía cinco lecturas. Debe ver el desafío realizado, una sola acreditación y la barra en 100%. Revisar desde el panel docente las actividades abiertas.
8. Conectar el proveedor mediante el adaptador y verificar `/api/precios/estado`, la fuente/fecha de cada activo y la evolución de la cartera ante una nueva cotización.

La contraseña incrustada se retiró del script actual; si correspondía a una credencial real, debe reemplazarse también en el servicio donde se usó. Borrarla del archivo no la elimina del historial previo de GitHub.

## Conservación y límites de recuperación

- No se borran alumnos, lecturas, compras ni ventas durante las migraciones.
- Las asignaciones antiguas sin escuela o temporada se mantienen como estaban. No es posible reconstruir de forma fiable su liga original a partir de los datos que el código anterior guardó. El informe de reparación identifica las asignaciones heredadas para que se revise su alcance.
- Para desafíos vencidos de lectura u operaciones se consulta evidencia anterior al cierre. La composición actual de cartera no prueba cómo era en una fecha pasada: esos casos requieren validación docente.
- Los precios históricos aleatorios ya guardados no pueden transformarse en datos reales. Permanecen en la base, separados de las series con fuente registrada.
- Las carteras existentes conservan sus precios de compra. Conectar ahora una fuente real puede generar saltos respecto de los valores iniciales de ejemplo; no se reinician ni se reescriben operaciones automáticamente.
- La comparación de semanas significa semanas con actividad, no una racha de días consecutivos. Otras consignas abiertas necesitan una regla nueva explícita o revisión docente.
- La activación de temporadas conserva el modelo existente de una cartera por alumno. No se implementó un archivo histórico independiente de carteras de cada temporada.

## Verificación realizada

- 27 pruebas automatizadas sobre PostgreSQL embebido (PGlite): asignaciones, lectura, vencimiento, puntaje, recuperación, valoración, datos inválidos, historial, errores de proveedor, permisos y registro.
- Compilación de producción de las 18 rutas del frontend con Next.js 16.4.3.
- Auditoría de dependencias de backend y frontend sin vulnerabilidades reportadas en la revisión final.
- Prueba HTTP local: las pantallas principales responden correctamente con la compilación de producción. La prueba interactiva con navegador no se pudo ejecutar: el entorno no disponía de Chromium y falló su descarga.
- No se aplicaron migraciones en Railway ni se hicieron operaciones con usuarios reales durante esta revisión.

Para repetir las pruebas:

```bash
cd backend
npm ci
npm test
cd ../frontend
npm ci
npm run build
```
