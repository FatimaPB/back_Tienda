const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Ruta para obtener todas las oraciones
router.get('/oracion', (req, res) => {
  const query = 'SELECT id, titulo, contenido, fecha_creacion FROM oraciones';

  db.query(query, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Error al obtener las oraciones' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'No se encontraron oraciones' });
    }

    res.status(200).json(results);
  });
});


module.exports = router;
