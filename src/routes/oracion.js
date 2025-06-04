const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Ruta para obtener la oración del Ángelus
router.get('/oracion', (req, res) => {
  const query = 'SELECT id, titulo, contenido, fecha_creacion FROM oraciones WHERE titulo = ?';

  db.query(query, ['Ángelus'], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Error al obtener la oración' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'Oración no encontrada' });
    }

    res.status(200).json(results[0]);
  });
});

module.exports = router;
