const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const UsuarioRoutes = require('./src/routes/usuarios');
const loginRoutes = require('./src/routes/login');
const multer = require('multer'); // Importar multer
const DocumentoRegulatorioRoutes = require('./src/routes/DocumentoRegulatorio');
const TerminosycondicionesRoutes = require('./src/routes/Terminosycondiciones');
const DeslindeRoutes = require('./src/routes/Deslinde');
const EmpresaRoutes = require('./src/routes/Empresa');
const authRoutes = require('./src/routes/auth')

app.use(cors({
    origin: 'https://tienda-lib-cr.vercel.app',  // Permite solicitudes solo desde este dominio
    credentials: true  // Habilita el envío y la recepción de cookies
}));


require("dotenv").config();
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/api',UsuarioRoutes);
app.use('/api',loginRoutes);
app.use('/api',DocumentoRegulatorioRoutes);
app.use('/api',TerminosycondicionesRoutes);
app.use('/api',DeslindeRoutes);
app.use('/api',EmpresaRoutes);
app.use('/api',authRoutes);

//Rutas
app.get("/", (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Bienvenido a mi API</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    background-color: #f0f0f0;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                }
                .container {
                    text-align: center;
                    padding: 20px;
                    background-color: #fff;
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                    border-radius: 8px;
                }
                h1 {
                    color: #333;
                    font-size: 2rem;
                    margin-bottom: 10px;
                }
                p {
                    color: #666;
                    font-size: 1rem;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Bienvenido a mi API de catedral :)</h1>
                <p>Gracias por visitarnos. ¡Esperamos que disfrutes explorando nuestra API!</p>
            </div>
        </body>
        </html>
    `);
});

//conexion a mongoose

mongoose
    .connect(process.env.MONGODB_URI)
    .then(()=> console.log("conectado a mongo atlas base catedral"))
    .catch((error)=> console.error(error));

app.listen(port, () => console.log('servidor escuchando en el puerto', port));

