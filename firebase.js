const admin = require('firebase-admin');
const serviceAccount = require('./src/config/libreria-cristo-rey-firebase-adminsdk-fbsvc-8a409a24ff.json'); // Asegúrate que coincida el nombre

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

module.exports = admin;
