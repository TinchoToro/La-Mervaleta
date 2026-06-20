// controllers/certificadoController.js – Genera certificado PDF con QR
const PDFDocument = require('pdfkit');
const QRCode     = require('qrcode');
const db         = require('../config/db');

const generarCertificado = async (req, res) => {
  try {
    const usuario_id = req.usuario.id;

    // Obtener datos del alumno y su rendimiento
    const { rows: alumnoRows } = await db.query(
      `SELECT u.nombre, u.apellido, u.anio_cursada,
              e.nombre AS escuela,
              c.capital_inicial, c.capital_actual,
              c.temporada_id,
              ROUND(((c.capital_actual - c.capital_inicial) / c.capital_inicial) * 100, 2) AS rendimiento_pct,
              RANK() OVER (ORDER BY c.capital_actual DESC) AS posicion,
              (SELECT COUNT(*) FROM usuarios WHERE rol = 'alumno' AND activo = TRUE) AS total_alumnos,
              (SELECT COUNT(*) FROM conceptos_vistos WHERE usuario_id = $1) AS conceptos_leidos,
              (SELECT COUNT(*) FROM operaciones WHERE usuario_id = $1) AS total_operaciones
       FROM usuarios u
       JOIN carteras c ON c.usuario_id = u.id
       LEFT JOIN escuelas e ON e.id = u.escuela_id
       WHERE u.id = $1`,
      [usuario_id]
    );

    if (alumnoRows.length === 0) {
      return res.status(404).json({ error: 'Alumno no encontrado' });
    }

    const a = alumnoRows[0];

    // Obtener datos de la temporada si existe
    let temporada = null;
    if (a.temporada_id) {
      const { rows: tempRows } = await db.query(
        'SELECT * FROM temporadas WHERE id = $1',
        [a.temporada_id]
      );
      if (tempRows.length > 0) {
        temporada = tempRows[0];
      }
    }

    // Verificar si la temporada terminó — solo se puede descargar cuando terminó
    if (temporada) {
      const ahora = new Date();
      const fechaFin = new Date(temporada.fecha_fin);
      if (ahora < fechaFin) {
        const diasRestantes = Math.ceil((fechaFin - ahora) / (1000 * 60 * 60 * 24));
        return res.status(403).json({
          error: `El certificado estará disponible cuando termine la liga. Quedan ${diasRestantes} día${diasRestantes !== 1 ? 's' : ''}.`,
          fecha_fin: temporada.fecha_fin,
          dias_restantes: diasRestantes
        });
      }
    }

    const fechaEmision = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
    const fechaInicio = temporada ? new Date(temporada.fecha_inicio).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' }) : null;
    const fechaFin = temporada ? new Date(temporada.fecha_fin).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' }) : null;

    const codigoVerificacion = `MERV-${usuario_id.slice(0,8).toUpperCase()}`;
    const urlVerificacion = `https://mervaleta.app/verificar/${codigoVerificacion}`;

    // Generar QR
    const qrDataUrl = await QRCode.toDataURL(urlVerificacion, {
      width: 120,
      margin: 1,
      color: { dark: '#059669', light: '#ffffff' }
    });
    const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');

    // Crear PDF
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=certificado_${a.nombre}_${a.apellido}.pdf`);
    doc.pipe(res);

    const W = 841.89;
    const H = 595.28;

    // Fondo oscuro
    doc.rect(0, 0, W, H).fill('#0b1120');

    // Borde decorativo exterior
    doc.rect(20, 20, W - 40, H - 40).lineWidth(2).stroke('#059669');
    doc.rect(28, 28, W - 56, H - 56).lineWidth(0.5).stroke('#0284c7');

    // Franja superior
    doc.rect(20, 20, W - 40, 8).fill('#059669');

    // Franja inferior
    doc.rect(20, H - 28, W - 40, 8).fill('#0284c7');

    // Logo M
    doc.roundedRect(60, 55, 60, 60, 12).fill('#059669');
    doc.fontSize(32).fillColor('#ffffff').font('Helvetica-Bold').text('M', 60, 68, { width: 60, align: 'center' });

    // Título La Mervaleta
    doc.fontSize(13).fillColor('#34d399').font('Helvetica-Bold')
       .text('LA MERVALETA', 135, 58, { characterSpacing: 3 });
    doc.fontSize(9).fillColor('#64748b').font('Helvetica')
       .text('Liga Escolar de Inversión · Proyecto Educativo', 135, 76);
    doc.fontSize(8).fillColor('#334155').font('Helvetica')
       .text('Lic. Martín Acuña · ESETP N° 703 · Puerto Madryn, Chubut', 135, 90);

    // Nombre de la temporada
    if (temporada) {
      doc.fontSize(8).fillColor('#0284c7').font('Helvetica-Bold')
         .text(`📅 ${temporada.nombre}${fechaInicio ? `  ·  ${fechaInicio} → ${fechaFin}` : ''}`, 135, 105);
    }

    // Línea separadora
    doc.moveTo(60, 125).lineTo(W - 60, 125).lineWidth(0.5).stroke('#1e293b');

    // Título del certificado
    doc.fontSize(11).fillColor('#475569').font('Helvetica')
       .text('CERTIFICADO DE PARTICIPACIÓN', 0, 142, { align: 'center', characterSpacing: 4 });

    // Nombre del alumno
    doc.fontSize(36).fillColor('#f1f5f9').font('Helvetica-Bold')
       .text(`${a.nombre} ${a.apellido}`, 0, 160, { align: 'center' });

    // Texto de certificación
    doc.fontSize(12).fillColor('#64748b').font('Helvetica')
       .text('completó exitosamente la Liga Escolar de Inversión', 0, 207, { align: 'center' });

    // Temporada y escuela
    let subtexto = '';
    if (temporada) subtexto += temporada.nombre;
    if (a.escuela) subtexto += (subtexto ? ' · ' : '') + a.escuela;
    if (a.anio_cursada) subtexto += ' · ' + a.anio_cursada;
    if (subtexto) {
      doc.fontSize(11).fillColor('#475569').font('Helvetica-Oblique')
         .text(subtexto, 0, 227, { align: 'center' });
    }

    // Línea separadora
    doc.moveTo(W/2 - 150, 252).lineTo(W/2 + 150, 252).lineWidth(0.5).stroke('#1e293b');

    // Métricas - 4 columnas
    const metricas = [
      { valor: `${a.rendimiento_pct >= 0 ? '+' : ''}${a.rendimiento_pct}%`, label: 'Rendimiento', color: a.rendimiento_pct >= 0 ? '#34d399' : '#f87171' },
      { valor: `#${a.posicion}`, label: `de ${a.total_alumnos} inversores`, color: '#60a5fa' },
      { valor: `${a.conceptos_leidos}`, label: 'Conceptos aprendidos', color: '#c084fc' },
      { valor: `${a.total_operaciones}`, label: 'Operaciones realizadas', color: '#fbbf24' },
    ];

    const metricaW = (W - 120) / 4;
    metricas.forEach((m, i) => {
      const x = 60 + i * metricaW;
      doc.roundedRect(x + 8, 265, metricaW - 16, 80, 8).fill('#0d1829');
      doc.roundedRect(x + 8, 265, metricaW - 16, 4, 2).fill(m.color);
      doc.fontSize(26).fillColor(m.color).font('Helvetica-Bold')
         .text(m.valor, x + 8, 280, { width: metricaW - 16, align: 'center' });
      doc.fontSize(8).fillColor('#475569').font('Helvetica')
         .text(m.label, x + 8, 313, { width: metricaW - 16, align: 'center' });
    });

    // Capital final
    doc.fontSize(11).fillColor('#334155').font('Helvetica')
       .text('Capital final:', W/2 - 100, 360, { width: 200, align: 'center' });
    doc.fontSize(16).fillColor('#f1f5f9').font('Helvetica-Bold')
       .text(`$${Number(a.capital_actual).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, W/2 - 100, 376, { width: 200, align: 'center' });

    // Firma docente (izquierda)
    doc.moveTo(80, 460).lineTo(240, 460).lineWidth(0.5).stroke('#1e293b');
    doc.fontSize(10).fillColor('#e2e8f0').font('Helvetica-Bold')
       .text('Lic. Martín Acuña', 80, 468, { width: 160, align: 'center' });
    doc.fontSize(8).fillColor('#475569').font('Helvetica')
       .text('Docente responsable', 80, 482, { width: 160, align: 'center' });
    doc.fontSize(7).fillColor('#334155').font('Helvetica')
       .text('ESETP N° 703 · Puerto Madryn', 80, 495, { width: 160, align: 'center' });

    // Fecha emisión y temporada (centro)
    doc.fontSize(10).fillColor('#64748b').font('Helvetica')
       .text(fechaEmision, 0, 468, { align: 'center' });
    doc.fontSize(8).fillColor('#334155').font('Helvetica')
       .text('Fecha de emisión', 0, 482, { align: 'center' });
    if (temporada && fechaInicio && fechaFin) {
      doc.fontSize(7).fillColor('#1e293b').font('Helvetica')
         .text(`Liga: ${fechaInicio} → ${fechaFin}`, 0, 496, { align: 'center' });
    }

    // QR (derecha)
    doc.image(qrBuffer, W - 200, 435, { width: 90, height: 90 });
    doc.fontSize(7).fillColor('#334155').font('Helvetica')
       .text(codigoVerificacion, W - 200, 530, { width: 90, align: 'center' });
    doc.fontSize(7).fillColor('#1e293b').font('Helvetica')
       .text('Escanear para verificar', W - 200, 540, { width: 90, align: 'center' });

    // Footer
    doc.fontSize(7).fillColor('#1e293b').font('Helvetica')
       .text('Proyecto Educativo · Mercado de Capitales · Ministerio de Educación de Chubut', 0, H - 45, { align: 'center' });

    doc.end();

  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error al generar certificado' });
    }
  }
};

module.exports = { generarCertificado };
