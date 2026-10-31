// Funciones PURAS: no tocan base de datos ni red, solo reciben datos y devuelven resultados.
// Dos intervalos [inicio, fin) se solapan si cada uno empieza antes de que termine el otro.
// Reservas "pegadas" (una termina cuando la otra empieza) NO se consideran solape.
const haySolape = (a, b) => a.inicio < b.fin && b.inicio < a.fin;

const normalizarFecha = (texto) => new Date(texto).toISOString();

module.exports = { haySolape, normalizarFecha };
