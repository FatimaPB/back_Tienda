// rutas/compras.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');  // Asegúrate de que la conexión esté configurada en db.js

// Ruta para registrar una compra
router.post('/compras', (req, res) => {
  const { proveedorId, detallesCompra } = req.body;
  let totalCompra = 0;

  // Primero, creamos la compra
  const queryCompra = 'INSERT INTO compras (proveedor_id, total) VALUES (?, ?)';
  db.query(queryCompra, [proveedorId, 0], (err, compraResult) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Error al registrar la compra' });
    }

    const compraId = compraResult.insertId;

    // Luego, agregamos los detalles de la compra
    let detallesCompletados = 0;
    for (let detalle of detallesCompra) {
      const { varianteId, cantidad, precioCompra } = detalle;

      // Agregar detalle de compra
      const queryDetalle = 'INSERT INTO detalle_compras (compra_id, variante_id, cantidad, precio_compra) VALUES (?, ?, ?, ?)';
      db.query(queryDetalle, [compraId, varianteId, cantidad, precioCompra], (err) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ message: 'Error al registrar el detalle de la compra' });
        }

        // Actualizamos el stock de la variante
        const queryStock = 'UPDATE variantes SET cantidad_stock = cantidad_stock + ? WHERE id = ?';
        db.query(queryStock, [cantidad, varianteId], (err) => {
          if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Error al actualizar el stock de la variante' });
          }

          // Calculamos el total de la compra
          totalCompra += cantidad * precioCompra;

          // Verificamos si todos los detalles se procesaron
          detallesCompletados++;
          if (detallesCompletados === detallesCompra.length) {
            // Ahora actualizamos el total de la compra
            const queryTotal = 'UPDATE compras SET total = ? WHERE id = ?';
            db.query(queryTotal, [totalCompra, compraId], (err) => {
              if (err) {
                console.error(err);
                return res.status(500).json({ message: 'Error al actualizar el total de la compra' });
              }

              res.status(201).json({ message: 'Compra registrada correctamente', compraId });
            });
          }
        });
      });
    }
  });
});

// Ruta para obtener todas las compras
router.get('/compras', (req, res) => {
  const query = 'SELECT * FROM compras';
  db.query(query, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Error al obtener las compras' });
    }
    res.status(200).json(results);
  });
});

// Ruta para eliminar una compra
router.delete('/compras/:id', (req, res) => {
  const { id } = req.params;

  const queryEliminarCompra = 'DELETE FROM compras WHERE id = ?';
  db.query(queryEliminarCompra, [id], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Error al eliminar la compra' });
    }

    const queryEliminarDetalleCompra = 'DELETE FROM detalle_compras WHERE compra_id = ?';
    db.query(queryEliminarDetalleCompra, [id], (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Error al eliminar los detalles de la compra' });
      }

      res.status(200).json({ message: 'Compra eliminada correctamente' });
    });
  });
});

module.exports = router;
