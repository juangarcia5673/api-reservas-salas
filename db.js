const Database = require('better-sqlite3');
const { hashear } = require('./utils/password');

function createDb(archivo = ':memory:') {
  const db = new Database(archivo);
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario    TEXT NOT NULL UNIQUE,
      clave_hash TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS salas (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre    TEXT NOT NULL UNIQUE,
      capacidad INTEGER NOT NULL CHECK (capacidad > 0),
      foto      TEXT
    );
    CREATE TABLE IF NOT EXISTS reservas (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      sala_id     INTEGER NOT NULL REFERENCES salas(id) ON DELETE CASCADE,
      responsable TEXT NOT NULL,
      motivo      TEXT NOT NULL DEFAULT '',
      inicio      TEXT NOT NULL,
      fin         TEXT NOT NULL CHECK (fin > inicio),
      version     INTEGER NOT NULL DEFAULT 1
    );
    CREATE INDEX IF NOT EXISTS idx_reservas_sala ON reservas (sala_id, inicio);
  `);

  // Datos iniciales de demostración
  if (db.prepare('SELECT COUNT(*) AS n FROM usuarios').get().n === 0) {
    db.prepare('INSERT INTO usuarios (usuario, clave_hash) VALUES (?, ?)')
      .run('admin', hashear(process.env.ADMIN_PASS || 'admin123'));
  }
  if (db.prepare('SELECT COUNT(*) AS n FROM salas').get().n === 0) {
    const insertar = db.prepare('INSERT INTO salas (nombre, capacidad) VALUES (?, ?)');
    insertar.run('Laboratorio 1', 30);
    insertar.run('Sala de reuniones A', 10);
  }
  return db;
}

module.exports = { createDb };
