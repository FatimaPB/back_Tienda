const express = require('express');
const router = express.Router();
const Deslinde = require('../models/Deslinde');

// Crear un nuevo Documento Regulatorio (POST)
router.post('/deslinde', async (req, res) => {
    const { titulo, contenido, fechaVigencia } = req.body;
  
    if (!titulo || !contenido || !fechaVigencia) {
      return res.status(400).json({ message: 'Todos los campos son requeridos.' });
    }
  
    try {
      // Crear un nuevo documento regulatorio
      const nuevoDocumento = new Deslinde({
        titulo,
        contenido,
        fechaVigencia
      });
  
      const documentoGuardado = await nuevoDocumento.save();
      res.status(201).json(documentoGuardado);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });
  
// Modificar un Documento Regulatorio (POST para crear una nueva versión)
router.post('/deslinde/:id/version', async (req, res) => {
    const { id } = req.params;
    const { contenido, fechaVigencia } = req.body;
  
    try {
      // Buscar el documento original por ID
      const documentoOriginal = await Deslinde.findById(id);
      if (!documentoOriginal) {
        return res.status(404).json({ message: 'Documento no encontrado.' });
      }
  
      // Marcar el documento original como no vigente
      documentoOriginal.vigente = false;
      await documentoOriginal.save(); // Guarda los cambios en el documento original
  
      // Crear una nueva versión
      const nuevaVersion = new Deslinde({
        titulo: documentoOriginal.titulo,
        contenido,
        fechaVigencia,
        version: (parseFloat(documentoOriginal.version) + 1).toFixed(1), // Incrementar la versión
        eliminado: false, // Marcar como no eliminado
        vigente: true // La nueva versión será vigente
      });
  
      const documentoGuardado = await nuevaVersion.save();
      res.status(201).json(documentoGuardado);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });
  
  
  

// Marcar un Documento Regulatorio como eliminado (DELETE lógico)
router.delete('/deslinde/:id', async (req, res) => {
    const { id } = req.params;
  
    try {
      const documento = await Deslinde.findById(id);
      if (!documento) {
        return res.status(404).json({ message: 'Documento no encontrado.' });
      }
  
      documento.eliminado = true;
      documento.vigente = false;  // No puede estar vigente si está eliminado
  
      const documentoEliminado = await documento.save();
      res.json({ message: 'Documento marcado como eliminado.', documentoEliminado });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

// Consulta de documento vigente
router.get('/deslinde/vigente', async (req, res) => {
    try {
      const documentoVigente = await Deslinde.findOne({ vigente: true, eliminado: false })
        .sort({ fechaCreacion: -1 });
  
      if (!documentoVigente) {
        return res.status(404).json({ message: 'No hay documentos vigentes.' });
      }
  
      res.json(documentoVigente);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });
  


// Consulta historial de versiones
router.get('/deslinde/historial', async (req, res) => {
    try {
      // Buscar todos los documentos, sin importar si están eliminados
      const historial = await Deslinde.find()
        .sort({ fechaCreacion: 1 });  // Orden por fecha de creación ascendente
  
      if (!historial || historial.length === 0) {
        return res.status(404).json({ message: 'No se encontraron versiones.' });
      }
  
      res.json(historial);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });
  
    

module.exports = router;
