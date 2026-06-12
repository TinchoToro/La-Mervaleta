// controllers/informeController.js – Informe PDF por alumno
const PDFDocument = require('pdfkit');
const db = require('../config/db');

const generarInforme = async (req, res) => {
  try {
    const usuario_id = req.params.id || req.usuario.id;

    // Verificar permisos — alumno solo ve el suyo, docente/admin puede ver cualquiera
    if (req.usuario.rol === 'alumno' && req.usuario.id !== usuario_id) {
      return res.status(403).json({ error: 'Sin permisos' });
    }

    // Datos del alumno
    const { rows: alumnoRows } = await db.query(
      `SELECT u.nombre, u.apellido, u.email, u.anio_cursada, u.perfil_riesgo,
              e.nombre AS escuela, e.ciudad,
              c.capital_inicial, c.capital_actual,
              ROUND(((c.capital_actual - c.capital_inicial) / c.capital_inicial) * 100, 2) AS rendimiento_pct
       FROM usuarios u
       JOIN carteras c ON c.usuario_id = u.id
       LEFT JOIN escuelas e ON e.id = u.escuela_id
       WHERE u.id = $1`,
      [usuario_id]
    );
    if (alumnoRows.length === 0) return res.status(404).json({ error: 'Alumno no encontrado' });
    const a = alumnoRows[0];

    // Posiciones
    const { rows: posiciones } = await db.query(
      `SELECT a.ticker, a.nombre, a.tipo, p.cantidad, p.precio_promedio,
              a.precio AS precio_actual,
              (p.cantidad * a.precio) AS valor_actual,
              ROUND(((a.precio - p.precio_promedio) / p.precio_promedio) * 100, 2) AS ganancia_pct
       FROM posiciones p
       JOIN carteras c ON c.id = p.cartera_id
       JOIN activos a ON a.id = p.activo_id
       WHERE c.usuario_id = $1 AND p.cantidad > 0
       ORDER BY valor_actual DESC`,
      [usuario_id]
    );

    // Operaciones recientes
    const { rows: operaciones } = await db.query(
      `SELECT o.tipo, a.ticker, o.cantidad, o.precio, o.total, o.fecha
       FROM operaciones o
       JOIN activos a ON a.id = o.activo_id
       WHERE o.usuario_id = $1
       ORDER BY o.fecha DESC
       LIMIT 10`,
      [usuario_id]
    );

    // Conceptos leídos
    const { rows: conceptosRows } = await db.query(
      `SELECT COUNT(*) AS leidos FROM conceptos_vistos WHERE usuario_id = $1`,
      [usuario_id]
    );
    const { rows: totalConceptos } = await db.query(
      `SELECT COUNT(*) AS total FROM conceptos WHERE activo = TRUE`
    );

    // Desafíos completados
    const { rows: desafiosRows } = await db.query(
      `SELECT d.nombre, dp.fecha_completado
       FROM desafios_progreso dp
       JOIN desafios d ON d.id = dp.desafio_id
       WHERE dp.usuario_id = $1 AND dp.completado = TRUE
       ORDER BY dp.fecha_completado DESC`,
      [usuario_id]
    );

    const fecha = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
    const sube = parseFloat(a.rendimiento_pct) >= 0;

    // Crear PDF A4 vertical
    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=informe_${a.nombre}_${a.apellido}.pdf`);
    doc.pipe(res);

    const W = 595.28;
    const H = 841.89;

    // Fondo
    doc.rect(0, 0, W, H).fill('#0b1120');

    // Header
    doc.rect(0, 0, W, 80).fill('#0d1829');
    doc.rect(0, 78, W, 2).fill('#059669');

    // Logo
    doc.roundedRect(30, 18, 44, 44, 10).fill('#059669');
    doc.fontSize(22).fillColor('#fff').font('Helvetica-Bold').text('M', 30, 28, { width: 44, align: 'center' });

    // Título
    doc.fontSize(18).fillColor('#f1f5f9').font('Helvetica-Bold').text('La Mervaleta', 86, 20);
    doc.fontSize(9).fillColor('#64748b').font('Helvetica').text('Informe de Performance · Liga Escolar de Inversión', 86, 42);
    doc.fontSize(8).fillColor('#334155').text(`Lic. Martín Acuña · ESETP N° 703 · Puerto Madryn, Chubut`, 86, 56);

    // Fecha
    doc.fontSize(9).fillColor('#475569').font('Helvetica').text(fecha, W - 130, 35, { width: 100, align: 'right' });

    let y = 100;

    // Sección alumno
    doc.rect(30, y, W - 60, 70).fill('#0d1829');
    doc.roundedRect(30, y, W - 60, 70, 8).fill('#0d1829');

    doc.fontSize(16).fillColor('#f1f5f9').font('Helvetica-Bold')
       .text(`${a.nombre} ${a.apellido}`, 50, y + 12);
    doc.fontSize(9).fillColor('#64748b').font('Helvetica')
       .text(`${a.email}${a.escuela ? ' · ' + a.escuela : ''}${a.ciudad ? ', ' + a.ciudad : ''}${a.anio_cursada ? ' · ' + a.anio_cursada : ''}`, 50, y + 32);
    if (a.perfil_riesgo) {
      const perfilColor = a.perfil_riesgo === 'conservador' ? '#34d399' : a.perfil_riesgo === 'moderado' ? '#fbbf24' : '#f87171';
      doc.roundedRect(50, y + 46, 80, 14, 4).fill(`${perfilColor}20`);
      doc.fontSize(8).fillColor(perfilColor).font('Helvetica-Bold')
         .text(`Perfil: ${a.perfil_riesgo.charAt(0).toUpperCase() + a.perfil_riesgo.slice(1)}`, 54, y + 49);
    }

    y += 85;

    // Métricas principales — 4 cards
    const metricaW = (W - 60 - 30) / 4;
    const metricas = [
      { label: 'Capital inicial', valor: `$${Number(a.capital_inicial).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`, color: '#60a5fa' },
      { label: 'Capital final', valor: `$${Number(a.capital_actual).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`, color: '#f1f5f9' },
      { label: 'Rendimiento', valor: `${sube ? '+' : ''}${a.rendimiento_pct}%`, color: sube ? '#34d399' : '#f87171' },
      { label: 'Operaciones', valor: `${operaciones.length}+`, color: '#fbbf24' },
    ];
    metricas.forEach((m, i) => {
      const x = 30 + i * (metricaW + 10);
      doc.roundedRect(x, y, metricaW, 56, 8).fill('#0d1829');
      doc.moveTo(x, y).lineTo(x + metricaW, y).lineWidth(2).stroke(m.color);
      doc.fontSize(18).fillColor(m.color).font('Helvetica-Bold').text(m.valor, x, y + 14, { width: metricaW, align: 'center' });
      doc.fontSize(8).fillColor('#475569').font('Helvetica').text(m.label, x, y + 38, { width: metricaW, align: 'center' });
    });

    y += 72;

    // Estadísticas adicionales
    const stats = [
      { label: 'Conceptos leídos', valor: `${conceptosRows[0].leidos}/${totalConceptos[0].total}` },
      { label: 'Desafíos completados', valor: `${desafiosRows.length}` },
      { label: 'Posiciones abiertas', valor: `${posiciones.length}` },
    ];
    stats.forEach((s, i) => {
      const x = 30 + i * ((W - 60) / 3 + 5);
      doc.roundedRect(x, y, (W - 60) / 3 - 5, 30, 6).fill('#131c2e');
      doc.fontSize(10).fillColor('#94a3b8').font('Helvetica-Bold').text(s.valor, x, y + 7, { width: (W - 60) / 3 - 5, align: 'center' });
      doc.fontSize(7).fillColor('#334155').font('Helvetica').text(s.label, x, y + 19, { width: (W - 60) / 3 - 5, align: 'center' });
    });

    y += 46;

    // Sección posiciones
    if (posiciones.length > 0) {
      doc.fontSize(11).fillColor('#94a3b8').font('Helvetica-Bold').text('POSICIONES ACTUALES', 30, y, { characterSpacing: 2 });
      y += 18;
      doc.moveTo(30, y).lineTo(W - 30, y).lineWidth(0.5).stroke('#1e293b');
      y += 8;

      const colW = [(W - 60) * 0.12, (W - 60) * 0.28, (W - 60) * 0.12, (W - 60) * 0.12, (W - 60) * 0.18, (W - 60) * 0.18];
      const cols = ['Ticker', 'Instrumento', 'Cantidad', 'P. Compra', 'Valor actual', 'Ganancia'];
      let cx = 30;
      cols.forEach((c, i) => {
        doc.fontSize(7).fillColor('#475569').font('Helvetica-Bold').text(c, cx, y, { width: colW[i] });
        cx += colW[i];
      });
      y += 14;

      posiciones.slice(0, 8).forEach((p, idx) => {
        if (idx % 2 === 0) doc.rect(30, y - 3, W - 60, 18).fill('#0d1829');
        let cx2 = 30;
        const cols2 = [
          p.ticker,
          p.nombre.slice(0, 25),
          p.cantidad.toString(),
          `$${Number(p.precio_promedio).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`,
          `$${Number(p.valor_actual).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`,
          `${p.ganancia_pct >= 0 ? '+' : ''}${p.ganancia_pct}%`,
        ];
        const colors2 = ['#60a5fa', '#94a3b8', '#94a3b8', '#94a3b8', '#f1f5f9', p.ganancia_pct >= 0 ? '#34d399' : '#f87171'];
        cols2.forEach((val, i) => {
          doc.fontSize(8).fillColor(colors2[i]).font(i === 5 ? 'Helvetica-Bold' : 'Helvetica').text(val, cx2, y, { width: colW[i] });
          cx2 += colW[i];
        });
        y += 18;
      });
      y += 10;
    }

    // Sección operaciones recientes
    if (operaciones.length > 0 && y < H - 150) {
      doc.fontSize(11).fillColor('#94a3b8').font('Helvetica-Bold').text('ÚLTIMAS OPERACIONES', 30, y, { characterSpacing: 2 });
      y += 18;
      doc.moveTo(30, y).lineTo(W - 30, y).lineWidth(0.5).stroke('#1e293b');
      y += 8;

      operaciones.slice(0, 6).forEach((op, idx) => {
        if (idx % 2 === 0) doc.rect(30, y - 3, W - 60, 16).fill('#0d1829');
        const tipo = op.tipo === 'compra' ? '▲ Compra' : '▼ Venta';
        const color = op.tipo === 'compra' ? '#34d399' : '#f87171';
        doc.fontSize(8).fillColor(color).font('Helvetica-Bold').text(tipo, 30, y, { width: 60 });
        doc.fontSize(8).fillColor('#60a5fa').font('Helvetica-Bold').text(op.ticker, 95, y, { width: 50 });
        doc.fontSize(8).fillColor('#94a3b8').font('Helvetica').text(`${op.cantidad} u.`, 150, y, { width: 50 });
        doc.fontSize(8).fillColor('#94a3b8').text(`$${Number(op.precio).toLocaleString('es-AR', { maximumFractionDigits: 2 })} c/u`, 205, y, { width: 100 });
        doc.fontSize(8).fillColor('#f1f5f9').font('Helvetica-Bold').text(`$${Number(op.total).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`, 310, y, { width: 100 });
        doc.fontSize(8).fillColor('#334155').font('Helvetica').text(new Date(op.fecha).toLocaleDateString('es-AR'), 415, y, { width: 80 });
        y += 16;
      });
      y += 10;
    }

    // Desafíos completados
    if (desafiosRows.length > 0 && y < H - 100) {
      doc.fontSize(11).fillColor('#94a3b8').font('Helvetica-Bold').text('DESAFÍOS COMPLETADOS', 30, y, { characterSpacing: 2 });
      y += 18;
      doc.moveTo(30, y).lineTo(W - 30, y).lineWidth(0.5).stroke('#1e293b');
      y += 8;
      desafiosRows.slice(0, 4).forEach((d, idx) => {
        doc.fontSize(8).fillColor('#34d399').font('Helvetica-Bold').text('✓', 30, y, { width: 15 });
        doc.fontSize(8).fillColor('#94a3b8').font('Helvetica').text(d.nombre, 48, y, { width: 300 });
        if (d.fecha_completado) {
          doc.fontSize(8).fillColor('#334155').text(new Date(d.fecha_completado).toLocaleDateString('es-AR'), 355, y, { width: 100 });
        }
        y += 15;
      });
    }

    // Footer
    doc.rect(0, H - 40, W, 40).fill('#0d1829');
    doc.moveTo(0, H - 40).lineTo(W, H - 40).lineWidth(1).stroke('#0284c7');
    doc.fontSize(7).fillColor('#334155').font('Helvetica')
       .text('Documento generado automáticamente por La Mervaleta · Proyecto Educativo · Ministerio de Educación de Chubut', 0, H - 25, { align: 'center' });

    doc.end();

  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.status(500).json({ error: 'Error al generar informe' });
  }
};

module.exports = { generarInforme };
