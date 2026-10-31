// Transformaciones puras: filas de la BD (snake_case) -> objetos de la API (camelCase).
const reservaADto = (fila) => ({
  id: fila.id,
  salaId: fila.sala_id,
  responsable: fila.responsable,
  motivo: fila.motivo,
  inicio: fila.inicio,
  fin: fila.fin,
  version: fila.version,
});

const salaADto = (fila) => ({
  id: fila.id,
  nombre: fila.nombre,
  capacidad: fila.capacidad,
  foto: fila.foto,
});

module.exports = { reservaADto, salaADto };
