const fs = require('node:fs');
const { AppError } = require('../utils/errors');
const { esImagenValida } = require('../utils/archivos');

module.exports = ({ salasService }) => ({
  listar: (_req, res) => res.json(salasService.listar()),
  obtener: (_req, res) => res.json(salasService.obtener(res.locals.params.id)),
  crear: (_req, res) => res.status(201).json(salasService.crear(res.locals.body)),

  // Se ejecuta ANTES de multer para no guardar archivos de salas que no existen.
  verificarExiste: (_req, res, next) => {
    salasService.obtener(res.locals.params.id);
    next();
  },

  subirFoto: (req, res) => {
    if (!req.file) {
      throw new AppError(400, 'VALIDACION', 'Debe adjuntar una imagen en el campo "foto"');
    }
    if (!esImagenValida(req.file.path)) {
      fs.unlinkSync(req.file.path);
      throw new AppError(400, 'ARCHIVO_INVALIDO', 'El contenido no corresponde a una imagen JPG o PNG');
    }
    res.status(201).json(salasService.asignarFoto(res.locals.params.id, `/uploads/${req.file.filename}`));
  },
});
