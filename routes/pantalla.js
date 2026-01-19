const express = require('express');
const router = express.Router();
const { dbHelpers } = require('../database');

// GET /api/pantalla - Estado actual para display
router.get('/', async (req, res) => {
  try {
    // Obtener turnos en atención (llamados)
    const turnosLlamados = await dbHelpers.all(`
      SELECT 
        t.codigo_turno,
        t.pin,
        tr.nombre as tramite_nombre,
        v.nombre as ventanilla_nombre,
        v.id as ventanilla_id
      FROM turnos t
      JOIN tramites tr ON t.tramite_id = tr.id
      JOIN ventanillas v ON t.ventanilla_id = v.id
      WHERE t.estado = 'llamado'
      ORDER BY v.id
    `);

    // Obtener contadores por trámite
    const contadores = await dbHelpers.all(`
      SELECT 
        tr.codigo,
        tr.nombre,
        COUNT(*) as cantidad
      FROM turnos t
      JOIN tramites tr ON t.tramite_id = tr.id
      WHERE t.estado = 'esperando'
      GROUP BY tr.id, tr.codigo, tr.nombre
      ORDER BY tr.codigo
    `);

    res.json({
      turnos_llamados: turnosLlamados,
      contadores: contadores
    });
  } catch (error) {
    console.error('Error al obtener estado pantalla:', error);
    res.status(500).json({ error: 'Error al obtener estado' });
  }
});

module.exports = router;