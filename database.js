const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Detectar si estamos en Railway con volumen montado
let dbPath;

if (process.env.RAILWAY_VOLUME_MOUNT_PATH) {
  // En Railway, usar el volumen
  const volumePath = process.env.RAILWAY_VOLUME_MOUNT_PATH;
  
  // Asegurarse de que el directorio existe
  if (!fs.existsSync(volumePath)) {
    fs.mkdirSync(volumePath, { recursive: true });
  }
  
  dbPath = path.join(volumePath, 'database.sqlite');
  console.log('📁 Usando volumen Railway:', dbPath);
} else {
  // En desarrollo local
  dbPath = path.join(__dirname, 'database.sqlite');
  console.log('📁 Usando BD local:', dbPath);
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error al conectar con la base de datos:', err);
  } else {
    console.log('✓ Conectado a la base de datos SQLite');
  }
});

// Inicializar tablas
const initDB = () => {
  db.serialize(() => {
    // Tabla de trámites
    db.run(`
      CREATE TABLE IF NOT EXISTS tramites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        codigo TEXT NOT NULL UNIQUE,
        activo INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de ventanillas
    db.run(`
      CREATE TABLE IF NOT EXISTS ventanillas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        activa INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Relación ventanillas-trámites
    db.run(`
      CREATE TABLE IF NOT EXISTS ventanilla_tramites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ventanilla_id INTEGER NOT NULL,
        tramite_id INTEGER NOT NULL,
        FOREIGN KEY (ventanilla_id) REFERENCES ventanillas(id) ON DELETE CASCADE,
        FOREIGN KEY (tramite_id) REFERENCES tramites(id) ON DELETE CASCADE,
        UNIQUE(ventanilla_id, tramite_id)
      )
    `);

    // Tabla de turnos
    db.run(`
      CREATE TABLE IF NOT EXISTS turnos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tramite_id INTEGER NOT NULL,
        codigo_turno TEXT NOT NULL UNIQUE,
        pin TEXT NOT NULL,
        uuid TEXT NOT NULL UNIQUE,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        estado TEXT DEFAULT 'esperando',
        ventanilla_id INTEGER,
        FOREIGN KEY (tramite_id) REFERENCES tramites(id),
        FOREIGN KEY (ventanilla_id) REFERENCES ventanillas(id)
      )
    `);

    // Índices
    db.run(`CREATE INDEX IF NOT EXISTS idx_turnos_estado ON turnos(estado)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_turnos_tramite ON turnos(tramite_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_turnos_timestamp ON turnos(timestamp)`);

    console.log('✓ Tablas inicializadas correctamente');

    // Insertar datos de ejemplo (solo si no existen)
    insertSampleData();
  });
};




// Datos de ejemplo para pruebas
const insertSampleData = () => {
  db.get('SELECT COUNT(*) as count FROM tramites', (err, row) => {
    if (row.count === 0) {
      const tramites = [
        { nombre: 'Consultas', codigo: 'A' },
        { nombre: 'Pagos', codigo: 'B' },
        { nombre: 'Documentación', codigo: 'C' }
      ];

      tramites.forEach(t => {
        db.run('INSERT INTO tramites (nombre, codigo) VALUES (?, ?)', [t.nombre, t.codigo]);
      });
      console.log('✓ Trámites de ejemplo creados');
    }
  });

  db.get('SELECT COUNT(*) as count FROM ventanillas', (err, row) => {
    if (row.count === 0) {
      const ventanillas = [
        { nombre: 'Ventanilla 1' },
        { nombre: 'Ventanilla 2' }
      ];

      ventanillas.forEach(v => {
        db.run('INSERT INTO ventanillas (nombre) VALUES (?)', [v.nombre], function(err) {
          // Asignar todos los trámites a cada ventanilla
          const ventanillaId = this.lastID;
          db.all('SELECT id FROM tramites', (err, tramites) => {
            tramites.forEach(t => {
              db.run('INSERT INTO ventanilla_tramites (ventanilla_id, tramite_id) VALUES (?, ?)', 
                [ventanillaId, t.id]);
            });
          });
        });
      });
      console.log('✓ Ventanillas de ejemplo creadas');
    }
  });
};

// Funciones helper
const dbHelpers = {
  // Ejecutar query con promesa
  run: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  },

  // Obtener un registro
  get: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  // Obtener múltiples registros
  all: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};


// Exportar también la función de migración
module.exports = { db, initDB, dbHelpers};