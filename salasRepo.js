module.exports = (db) => ({
  listar: () => db.prepare('SELECT * FROM salas ORDER BY id').all(),
  obtener: (id) => db.prepare('SELECT * FROM salas WHERE id = ?').get(id),
  buscarPorNombre: (nombre) => db.prepare('SELECT * FROM salas WHERE nombre = ?').get(nombre),
  crear: ({ nombre, capacidad }) => {
    const info = db.prepare('INSERT INTO salas (nombre, capacidad) VALUES (?, ?)').run(nombre, capacidad);
    return db.prepare('SELECT * FROM salas WHERE id = ?').get(info.lastInsertRowid);
  },
  actualizarFoto: (id, foto) => db.prepare('UPDATE salas SET foto = ? WHERE id = ?').run(foto, id),
});
