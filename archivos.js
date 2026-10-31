const fs = require('node:fs');

// No basta con confiar en el tipo MIME que declara el cliente: se revisan los primeros bytes.
const FIRMAS = [
  Buffer.from([0x89, 0x50, 0x4e, 0x47]), // PNG
  Buffer.from([0xff, 0xd8, 0xff]),       // JPEG
];

const esImagenValida = (ruta) => {
  const fd = fs.openSync(ruta, 'r');
  try {
    const cabecera = Buffer.alloc(4);
    fs.readSync(fd, cabecera, 0, 4, 0);
    return FIRMAS.some((firma) => cabecera.subarray(0, firma.length).equals(firma));
  } finally {
    fs.closeSync(fd);
  }
};

module.exports = { esImagenValida };
