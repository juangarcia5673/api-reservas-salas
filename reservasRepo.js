module.exports = (db) => ({
  listar: ({ salaId = null, fecha = null } = {}) =>
    db.prepare(`
      SELECT * FROM reservas
      WHERE (@salaId IS NULL OR sala_id = @salaId)
        AND (@fecha  IS NULL OR substr(inicio, 1, 10) = @fecha)
      ORDER BY inicio
    `).all({ salaId, fecha }),

  listarPorSala: (salaId) =>
    db.prepare('SELECT * FROM reservas WHERE sala_id = ? ORDER BY inicio').all(salaId),

  obtener: (id) => db.prepare('SELECT * FROM reservas WHERE id = ?').get(id),

  crear: ({ salaId, responsable, motivo, inicio, fin }) => {
    const info = db.prepare(`
      INSERT INTO reservas (sala_id, responsable, motivo, inicio, fin)
      VALUES (?, ?, ?, ?, ?)
    `).run(salaId, responsable, motivo, inicio, fin);
    return db.prepare('SELECT * FROM reservas WHERE id = ?').get(info.lastInsertRowid);
  },

  // Control de concurrencia optimista: solo actualiza si la versión coincide.
  // Devuelve cuántas filas cambiaron (0 = alguien más la modificó antes).
  actualizar: (id, { salaId, responsable, motivo, inicio, fin, version }) =>
    db.prepare(`
      UPDATE reservas
      SET sala_id = @salaId, responsable = @responsable, motivo = @motivo,
          inicio = @inicio, fin = @fin, version = version + 1
      WHERE id = @id AND version = @version
    `).run({ id, salaId, responsable, motivo, inicio, fin, version }).changes,

  eliminar: (id) => db.prepare('DELETE FROM reservas WHERE id = ?').run(id).changes,
});
