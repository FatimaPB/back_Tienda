const express = require('express');
const db = require('./src/config/db'); // Conexión a MySQL
const cors = require('cors');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const UsuarioRoutes = require('./src/routes/usuarios');
const loginRoutes = require('./src/routes/login');
const multer = require('multer'); // Importar multer
const DocumentoRegulatorioRoutes = require('./src/routes/DocumentoRegulatorio');
const TerminosycondicionesRoutes = require('./src/routes/Terminosycondiciones');
const DeslindeRoutes = require('./src/routes/Deslinde');
const EmpresaRoutes = require('./src/routes/Empresa');
const authRoutes = require('./src/routes/auth');
const limiteIntentosRoutes = require('./src/routes/limiteIntentosRoutes');
const CategoriaRoutes = require('./src/routes/Cateoria'); // Revisa el nombre de tu archivo
const ColorRoutes = require('./src/routes/Color');
const TamanosRoutes = require('./src/routes/Tamanos');
const productosRoutes = require('./src/routes/productos');
const bannerRoutes = require('./src/routes/banner');
const nosotrosRoutes = require('./src/routes/nosotros');
const metodoPagoRouter = require('./src/routes/metodos_pago');

const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost', 'http://localhost:4200'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

require('dotenv').config();
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors(corsOptions));
app.use(cookieParser());

app.use('/api', UsuarioRoutes);
app.use('/api', loginRoutes);
app.use('/api', DocumentoRegulatorioRoutes);
app.use('/api', TerminosycondicionesRoutes);
app.use('/api', DeslindeRoutes);
app.use('/api', EmpresaRoutes);
app.use('/api', authRoutes);
app.use('/api', limiteIntentosRoutes);
app.use('/api', CategoriaRoutes);
app.use('/api', ColorRoutes);
app.use('/api', TamanosRoutes);
app.use('/api', productosRoutes);
app.use('/api', bannerRoutes);
app.use('/api', nosotrosRoutes);
app.use('/api', metodoPagoRouter);

// Ruta de bienvenida
app.get("/", (req, res) => {
  res.send("Servidor funcionando");
});

// Ruta de prueba para verificar la conexión a MySQL
app.get("/test-db", (req, res) => {
  db.query('SELECT NOW() as fecha_actual', (err, results) => {
    if (err) {
      console.error('❌ Error ejecutando la consulta:', err);
      return res.status(500).json({ error: 'Error conectando a la base de datos' });
    }
    res.json({ mensaje: "✅ Conexión exitosa a MySQL db libreria", servidor_hora: results[0].fecha_actual });
  });
});

// Si no se está ejecutando en el entorno de Vercel, inicia el servidor de forma local
if (!process.env.VERCEL_ENV) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`🚀 Servidor escuchando en el puerto ${port}`);
  });
}

module.exports = app;
