const express = require('express');
const router = express.Router();
const admin = require('../../firebase'); // este es el que exportaste

router.post('/notificar', async (req, res) => {
  const { token, title, body } = req.body;

  if (!token || !title || !body) {
    return res.status(400).json({ error: 'Faltan campos: token, title o body' });
  }

  const message = {
    notification: {
      title,
      body
    },
    token
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('Notificación enviada:', response);
    res.json({ success: true, response });
  } catch (error) {
    console.error('Error al enviar notificación:', error);
    res.status(500).json({ success: false, error });
  }
});

module.exports = router;
