const fs = require('node:fs');
const multer = require('multer');
const { AppError } = require('../utils/errors');

// La extensión se decide por nuestra lista blanca, nunca por el nombre que envía el cliente.
const TIPOS = { 'image/jpeg': '.jpg', 'image/png': '.png' };

const crearSubida = (directorio) => {
  fs.mkdirSync(directorio, { recursive: true });
  return multer({
    storage: multer.diskStorage({
      destination: directorio,
      filename: (req, file, cb) => cb(null, `sala-${req.params.id}-${Date.now()}${TIPOS[file.mimetype]}`),
    }),
    limits: { fileSize: 2 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) =>
      TIPOS[file.mimetype]
        ? cb(null, true)
        : cb(new AppError(400, 'ARCHIVO_INVALIDO', 'Solo se permiten imágenes JPG o PNG')),
  }).single('foto');
};

module.exports = { crearSubida };
