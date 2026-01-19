const express = require('express');
const router = express.Router();
const { dbHelpers } = require('../database');

// Generar código de turno único
const generarCodigoTurno = async (codigoTramite) => {

  // Obtener el último número del día para este trámite
const hoy = new Date().toISOString().split('T')[0];

  
const ultimo = await dbHelpers.get(`
    SELECT codigo_turno 
    FROM turnos 
    WHERE tramite_id IN (SELECT id FROM tramites WHERE codigo = ?)
    AND DATE(timestamp) = ?
    ORDER BY id DESC LIMIT 1
  `, [codigoTramite, hoy]);

  let numero = 1;
  if (ultimo) {
    const match = ultimo.codigo_turno.match(/\d+$/);
    if (match) {
      numero = parseInt(match[0]) + 1;
    }
  }

  return `${codigoTramite}-${numero.toString().padStart(3, '0')}`;
};

// Generar PIN de 4 dígitos
const generarPIN = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// GET /api/tramites - Listar trámites activos
router.get('/tramites', async (req, res) => {
  try {
    const tramites = await dbHelpers.all(
      'SELECT id, nombre, codigo FROM tramites WHERE activo = 1 ORDER BY nombre'
    );
    res.json(tramites);
  } catch (error) {
    console.error('Error al obtener trámites:', error);
    res.status(500).json({ error: 'Error al obtener trámites' });
  }
});


const crypto = require('crypto');

// Generar UUID único
const generarUUID = () => {
  return crypto.randomBytes(16).toString('hex');
};

// POST /api/turno - Crear nuevo turno
router.post('/turno', async (req, res) => {
  try {
    const { tramite_id } = req.body;

    if (!tramite_id) {
      return res.status(400).json({ error: 'tramite_id es requerido' });
    }

    const tramite = await dbHelpers.get(
      'SELECT * FROM tramites WHERE id = ? AND activo = 1',
      [tramite_id]
    );

    if (!tramite) {
      return res.status(404).json({ error: 'Trámite no encontrado o inactivo' });
    }

    const codigoTurno = await generarCodigoTurno(tramite.codigo);
    const pin = generarPIN();
    const uuid = generarUUID();

    const result = await dbHelpers.run(
      'INSERT INTO turnos (tramite_id, codigo_turno, pin, uuid) VALUES (?, ?, ?, ?)',
      [tramite_id, codigoTurno, pin, uuid]
    );

    const turno = {
      id: result.lastID,
      tramite_id,
      tramite_nombre: tramite.nombre,
      codigo_turno: codigoTurno,
      pin,
      uuid,
      timestamp: new Date().toISOString()
    };

    const io = req.app.get('io');
    io.emit('turno-creado', turno);

    res.json(turno);
  } catch (error) {
    console.error('Error al crear turno:', error);
    res.status(500).json({ error: 'Error al crear turno' });
  }
});

// GET /api/turno/:uuid - Obtener info de un turno por UUID
router.get('/turno/:uuid', async (req, res) => {
  try {
    const { uuid } = req.params;
    
    console.log('Buscando turno con UUID:', uuid); // LOG para debug

    const turno = await dbHelpers.get(`
      SELECT 
        t.id,
        t.codigo_turno,
        t.pin,
        t.timestamp,
        t.estado,
        tr.nombre as tramite_nombre,
        tr.codigo as tramite_codigo,
        v.nombre as ventanilla_nombre
      FROM turnos t
      JOIN tramites tr ON t.tramite_id = tr.id
      LEFT JOIN ventanillas v ON t.ventanilla_id = v.id
      WHERE t.uuid = ?
    `, [uuid]);

    if (!turno) {
      console.log('Turno no encontrado'); // LOG para debug
      return res.status(404).json({ error: 'Turno no encontrado' });
    }

    console.log('Turno encontrado:', turno); // LOG para debug
    res.json(turno);
  } catch (error) {
    console.error('Error al obtener turno:', error);
    res.status(500).json({ error: 'Error al obtener turno' });
  }
});

module.exports = router;