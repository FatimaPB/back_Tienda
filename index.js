const express = require('express');
const mongoose = require('mongoose');
const db = require('./src/config/db'); // Importar la conexión a MySQL
const cors = require('cors');
const https = require('https');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const UsuarioRoutes = require('./src/routes/usuarios');
const loginRoutes = require('./src/routes/login');
const multer = require('multer'); // Importar multer
const DocumentoRegulatorioRoutes = require('./src/routes/DocumentoRegulatorio');
const TerminosycondicionesRoutes = require('./src/routes/Terminosycondiciones');
const DeslindeRoutes = require('./src/routes/Deslinde');
const EmpresaRoutes = require('./src/routes/Empresa');
const authRoutes = require('./src/routes/auth')
const limiteIntentosRoutes = require('./src/routes/limiteIntentosRoutes');
const CategoriaRoutes = require('./src/routes/Cateoria');
const ColorRoutes = require('./src/routes/Color');
const TamanosRoutes = require('./src/routes/Tamanos')
const productosRoutes = require('./src/routes/productos');
const bannerRoutes = require('./src/routes/banner');
const nosotrosRoutes = require('./src/routes/nosotros');
const metodoPagoRouter=require('./src/routes/metodos_pago');

const corsOptions = {
    origin: ['http://localhost:3000', 'http://localhost', 'http://localhost:4200'], // Permite solo desde localhost
    credentials: true,  // Permite el uso de cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE'],  // Métodos permitidos
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],  // Encabezados permitidos
    preflightContinue: true,  // Permite continuar con la solicitud después de la prevalidación (opcional)
};



require("dotenv").config();
const app = express();

// Rutas a los certificados generados
const key = fs.readFileSync('C:/nginx-1.26.2/ssl/libreriacristorey.key', 'utf8');
const cert = fs.readFileSync('C:/nginx-1.26.2/ssl/libreriacristorey.crt', 'utf8');

// Configurar servidor HTTPS
const server = https.createServer({ key, cert }, app);


const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors(corsOptions));


  
app.use(cookieParser());

app.use('/api',UsuarioRoutes);
app.use('/api',loginRoutes);
app.use('/api',DocumentoRegulatorioRoutes);
app.use('/api',TerminosycondicionesRoutes);
app.use('/api',DeslindeRoutes);
app.use('/api',EmpresaRoutes);
app.use('/api',authRoutes);
app.use('/api', limiteIntentosRoutes);
app.use('/api', CategoriaRoutes);
app.use('/api', ColorRoutes);
app.use('/api', TamanosRoutes);
app.use('/api', productosRoutes);
app.use('/api', bannerRoutes);
app.use('/api', nosotrosRoutes);
app.use('/api', metodoPagoRouter);


app.get("/", (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Bienvenido a la API</title>
        </head>
        <body>
            <h1>Bienvenido a la API de la Librería Diocesana Cristo Rey</h1>
            <p>El servidor está funcionando correctamente.</p>
        </body>
        </html>
    `);
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

app.listen(port, () => {
    console.log(`🚀 Servidor escuchando en el puerto ${port}`);
});

