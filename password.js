const { scryptSync, randomBytes, timingSafeEqual } = require('node:crypto');

// Nunca se guarda la clave en texto plano: se guarda "sal:hash" (scrypt).
const hashear = (clave) => {
  const sal = randomBytes(16).toString('hex');
  return `${sal}:${scryptSync(clave, sal, 32).toString('hex')}`;
};

const verificar = (clave, almacenado) => {
  const [sal, hash] = almacenado.split(':');
  const calculado = scryptSync(clave, sal, 32);
  const esperado = Buffer.from(hash, 'hex');
  return calculado.length === esperado.length && timingSafeEqual(calculado, esperado);
};

module.exports = { hashear, verificar };
