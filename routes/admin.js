const express = require("express");
const router = express.Router();
const { dbHelpers } = require("../database");

// Middleware de autenticación simple
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token || token !== "authenticated") {
    return res.status(401).json({ error: "No autoritzat" });
  }
  next();
};

// POST /api/admin/login
router.post("/login", (req, res) => {
  const { usuario, pin } = req.body;

  if (usuario === process.env.ADMIN_USER && pin === process.env.ADMIN_PIN) {
    res.json({
      success: true,
      token: "authenticated", // Token simple para este caso
    });
  } else {
    res.status(401).json({ error: "Credencials incorrectes" });
  }
});

// ========== TRÁMITES ==========

// GET /api/admin/tramites
router.get("/tramites", authMiddleware, async (req, res) => {
  try {
    const tramites = await dbHelpers.all(
      "SELECT * FROM tramites ORDER BY codigo",
    );
    res.json(tramites);
  } catch (error) {
    res.status(500).json({ error: "Error en obtenir els tràmits" });
  }
});

// POST /api/admin/tramites
router.post("/tramites", authMiddleware, async (req, res) => {
  try {
    const { nombre, codigo } = req.body;

    if (!nombre || !codigo) {
      return res.status(400).json({ error: "Nom i codi són necessaris" });
    }

    const result = await dbHelpers.run(
      "INSERT INTO tramites (nombre, codigo) VALUES (?, ?)",
      [nombre, codigo.toUpperCase()],
    );

    const io = req.app.get('io');
    io.emit('tramites-actualizado');

    res.json({ id: result.lastID, nombre, codigo: codigo.toUpperCase() });
  } catch (error) {
    if (error.message.includes("UNIQUE")) {
      res.status(400).json({ error: "El codi ja existeix" });
    } else {
      res.status(500).json({ error: "Error en crear el tràmit" });
    }
  }
});

// PUT /api/admin/tramites/:id
router.put("/tramites/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, codigo, activo } = req.body;

    await dbHelpers.run(
      "UPDATE tramites SET nombre = ?, codigo = ?, activo = ? WHERE id = ?",
      [nombre, codigo.toUpperCase(), activo ? 1 : 0, id],
    );

    const io = req.app.get('io');
    io.emit('tramites-actualizado');

    res.json({ success: true });
  } catch (error) {
    console.error("Error en actualitzar el tràmit:", error);
    if (error.message.includes("UNIQUE")) {
      res.status(400).json({ error: "El codi ja existeix" });
    } else {
      res
        .status(500)
        .json({ error: `Error en actualitzar el tràmit: ${error.message}` });
    }
  }
});

// DELETE /api/admin/tramites/:id
router.delete('/tramites/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await dbHelpers.run('DELETE FROM tramites WHERE id = ?', [id]);

    const io = req.app.get('io');
    io.emit('tramites-actualizado');

    res.json({ success: true });
  } catch (error) {
    console.error('Error en eliminar el tràmit:', error);
    res.status(500).json({ error: `Error en eliminar el tràmit: ${error.message}` });
  }
});

// ========== VENTANILLAS ==========

// GET /api/admin/ventanillas
router.get("/ventanillas", authMiddleware, async (req, res) => {
  try {
    const ventanillas = await dbHelpers.all(
      "SELECT * FROM ventanillas ORDER BY id",
    );

    // Para cada ventanilla, obtener sus trámites asignados
    for (let v of ventanillas) {
      const tramites = await dbHelpers.all(
        `
        SELECT t.id, t.nombre, t.codigo
        FROM tramites t
        JOIN ventanilla_tramites vt ON t.id = vt.tramite_id
        WHERE vt.ventanilla_id = ?
      `,
        [v.id],
      );
      v.tramites = tramites;
    }

    res.json(ventanillas);
  } catch (error) {
    res.status(500).json({ error: "Error en obtenir les finestres" });
  }
});

// POST /api/admin/ventanillas
router.post("/ventanillas", authMiddleware, async (req, res) => {
  try {
    const { nombre, tramite_ids } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: "Nom és necessari" });
    }

    const result = await dbHelpers.run(
      "INSERT INTO ventanillas (nombre) VALUES (?)",
      [nombre],
    );

    const ventanillaId = result.lastID;

    // Asignar trámites si se proporcionaron
    if (tramite_ids && tramite_ids.length > 0) {
      for (let tramiteId of tramite_ids) {
        await dbHelpers.run(
          "INSERT INTO ventanilla_tramites (ventanilla_id, tramite_id) VALUES (?, ?)",
          [ventanillaId, tramiteId],
        );
      }
    }

    res.json({ id: ventanillaId, nombre });
  } catch (error) {
    res.status(500).json({ error: "Error en crear la finestra" });
  }
});

// PUT /api/admin/ventanillas/:id
router.put('/ventanillas/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, activa, tramite_ids } = req.body;

    await dbHelpers.run(
      'UPDATE ventanillas SET nombre = ?, activa = ? WHERE id = ?',
      [nombre, activa ? 1 : 0, id]
    );

    // Actualizar trámites asignados
    if (tramite_ids !== undefined) {
      // Eliminar asignaciones anteriores
      await dbHelpers.run(
        'DELETE FROM ventanilla_tramites WHERE ventanilla_id = ?',
        [id]
      );

      // Insertar nuevas asignaciones
      for (let tramiteId of tramite_ids) {
        await dbHelpers.run(
          'INSERT INTO ventanilla_tramites (ventanilla_id, tramite_id) VALUES (?, ?)',
          [id, tramiteId]
        );
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error en actualitzar la finestra:', error);
    res.status(500).json({ error: `Error en actualitzar la finestra: ${error.message}` });
  }
});

// DELETE /api/admin/ventanillas/:id
router.delete('/ventanillas/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await dbHelpers.run('DELETE FROM ventanillas WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error en eliminar la finestra:', error);
    res.status(500).json({ error: `Error en eliminar la finestra: ${error.message}` });
  }
});

// ========== GESTIÓN DE COLAS ==========

// GET /api/admin/colas - Estado de todas las colas
router.get("/colas", authMiddleware, async (req, res) => {
  try {
    const ventanillas = await dbHelpers.all(`
      SELECT * FROM ventanillas WHERE activa = 1 ORDER BY id
    `);

    for (let v of ventanillas) {
      // Trámites que puede atender
      v.tramites = await dbHelpers.all(
        `
        SELECT t.id, t.nombre, t.codigo
        FROM tramites t
        JOIN ventanilla_tramites vt ON t.id = vt.tramite_id
        WHERE vt.ventanilla_id = ? AND t.activo = 1
      `,
        [v.id],
      );

      // Turno actual (si existe)
      v.turno_actual = await dbHelpers.get(
        `
        SELECT codigo_turno, pin, tramite_id
        FROM turnos
        WHERE ventanilla_id = ? AND estado = 'llamado'
        LIMIT 1
      `,
        [v.id],
      );

      // Contador de cola por cada trámite que puede atender
      v.cola = {};
      for (let tramite of v.tramites) {
        const count = await dbHelpers.get(
          `
          SELECT COUNT(*) as cantidad
          FROM turnos
          WHERE tramite_id = ? AND estado = 'esperando'
        `,
          [tramite.id],
        );
        v.cola[tramite.codigo] = count.cantidad;
      }
    }

    res.json(ventanillas);
  } catch (error) {
    console.error("Error en obtenir les cues:", error);
    res.status(500).json({ error: "Error en obtenir l'estat de les cues" });
  }
});

// POST /api/admin/siguiente - Llamar siguiente turno
router.post("/siguiente", authMiddleware, async (req, res) => {
  try {
    const { ventanilla_id } = req.body;

    if (!ventanilla_id) {
      return res.status(400).json({ error: "ventanilla_id es requerido" });
    }

    // Eliminar turno anterior de esta ventanilla
    await dbHelpers.run(
      'DELETE FROM turnos WHERE ventanilla_id = ? AND estado = "llamado"',
      [ventanilla_id],
    );

    // Obtener trámites que puede atender esta ventanilla
    const tramites = await dbHelpers.all(
      `
      SELECT tramite_id
      FROM ventanilla_tramites
      WHERE ventanilla_id = ?
    `,
      [ventanilla_id],
    );

    const tramiteIds = tramites.map((t) => t.tramite_id);

    if (tramiteIds.length === 0) {
      return res
        .status(400)
        .json({ error: "Finestra sense tràmits assignats" });
    }

    // Buscar siguiente turno más antiguo de esos trámites
    const siguienteTurno = await dbHelpers.get(`
      SELECT * FROM turnos
      WHERE tramite_id IN (${tramiteIds.join(",")})
      AND estado = 'esperando'
      ORDER BY timestamp ASC
      LIMIT 1
    `);

    if (!siguienteTurno) {
      return res.json({ mensaje: "No hi ha torns en espera" });
    }

    // Actualizar turno
    await dbHelpers.run(
      'UPDATE turnos SET estado = "llamado", ventanilla_id = ? WHERE id = ?',
      [ventanilla_id, siguienteTurno.id],
    );

    // Obtener información completa del turno
    const turnoCompleto = await dbHelpers.get(
      `
      SELECT 
        t.codigo_turno,
        t.pin,
        tr.nombre as tramite_nombre,
        v.nombre as ventanilla_nombre,
        v.id as ventanilla_id
      FROM turnos t
      JOIN tramites tr ON t.tramite_id = tr.id
      JOIN ventanillas v ON t.ventanilla_id = v.id
      WHERE t.id = ?
    `,
      [siguienteTurno.id],
    );

    // Emitir evento Socket.io
    const io = req.app.get("io");
    io.emit("turno-llamado", turnoCompleto);

    res.json(turnoCompleto);
  } catch (error) {
    console.error("Error en cridar el següent torn:", error);
    res.status(500).json({ error: "Error en cridar el següent torn" });
  }
});

// POST /api/admin/rellamar - Rellamar turno actual
router.post("/rellamar", authMiddleware, async (req, res) => {
  try {
    const { ventanilla_id } = req.body;

    const turnoActual = await dbHelpers.get(
      `
      SELECT 
        t.codigo_turno,
        t.pin,
        tr.nombre as tramite_nombre,
        v.nombre as ventanilla_nombre,
        v.id as ventanilla_id
      FROM turnos t
      JOIN tramites tr ON t.tramite_id = tr.id
      JOIN ventanillas v ON t.ventanilla_id = v.id
      WHERE t.ventanilla_id = ? AND t.estado = 'llamado'
    `,
      [ventanilla_id],
    );

    if (!turnoActual) {
      return res
        .status(404)
        .json({ error: "No hi ha torn actual per tornar a cridar" });
    }

    // Emitir evento Socket.io
    const io = req.app.get("io");
    io.emit("turno-llamado", turnoActual);

    res.json(turnoActual);
  } catch (error) {
    res.status(500).json({ error: "Error en tornar a cridar el torn" });
  }
});

// POST /api/admin/reset-turnos - Resetear todos los turnos
router.post('/reset-turnos', authMiddleware, async (req, res) => {
  try {
    await dbHelpers.run('DELETE FROM turnos');

    const io = req.app.get('io');
    io.emit('pantalla-actualizada');

    res.json({ success: true, mensaje: 'Todos los turnos han sido eliminados' });
  } catch (error) {
    console.error('Error al resetear turnos:', error);
    res.status(500).json({ error: `Error al resetear turnos: ${error.message}` });
  }
});

module.exports = router;
