const express = require('express');
const bcryptjs = require('bcryptjs');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const UsuarioSchema = require('../models/usuarios'); // Asegúrate de importar tu modelo de usuario
const router = express.Router();

const JWT_SECRET = 'tu_clave_secreta'; // Guarda esto en un archivo de entorno

// Ruta para iniciar sesión
router.post('/login', async (req, res) => {
    try {
        const { correo, contrasena, recaptcha } = req.body;

        // Verificación del reCAPTCHA
        const secretKey = '6LeiqGsqAAAAAN0c3iRx89cvzYXh4lvdejJmZIS1'; // Reemplaza con tu clave secreta
        const response = await axios.post(`https://www.google.com/recaptcha/api/siteverify`, null, {
            params: {
                secret: secretKey,
                response: recaptcha
            }
        });
    
        const { success } = response.data;
    
        if (!success) {
            return res.status(400).json({ message: 'Error de verificación de reCAPTCHA.' });
        }
    
        // Buscar al usuario por correo
        const usuario = await UsuarioSchema.findOne({ correo });
        if (!usuario) {
            return res.status(400).json({ message: 'Correo o contraseña incorrectos' });
        }

        // Verificar si la cuenta está bloqueada y si el tiempo de bloqueo ha expirado
        const now = new Date();
        if (usuario.isBlocked && usuario.blockedUntil > now) {
            return res.status(403).json({ message: 'Cuenta bloqueada. Intenta más tarde.' });
        } else if (usuario.isBlocked && usuario.blockedUntil <= now) {
            // Restablecer el estado de bloqueo si el tiempo ha expirado
            usuario.isBlocked = false;
            usuario.failedAttempts = 0; // Reiniciar intentos fallidos
            usuario.blockedUntil = null; // Limpiar el campo de bloqueo
        }

        // Verificar la contraseña
        const isPasswordValid = await bcryptjs.compare(contrasena, usuario.contrasena);
        if (!isPasswordValid) {
            // Aumentar el contador de intentos fallidos
            usuario.failedAttempts += 1;

            // Bloquear la cuenta si se superan los 5 intentos
            if (usuario.failedAttempts >= 5) {
                usuario.isBlocked = true;
                usuario.blockedUntil = new Date(Date.now() + 2 * 60 * 1000); 
            }

            await usuario.save(); // Guarda los cambios en la base de datos
            return res.status(400).json({ message: 'Credenciales invalidas' });
        }

        // Reiniciar los intentos fallidos si la contraseña es válida
        usuario.failedAttempts = 0;
        await usuario.save(); // Guarda los cambios en la base de datos

        // Generar un token JWT con el tipo de usuario
        const token = jwt.sign(
            {
                id: usuario._id,
                correo: usuario.correo,
                tipoUsuario: usuario.tipoUsuario // Asegúrate de que 'tipo' es el nombre del campo en tu esquema
            },
            JWT_SECRET,
            { expiresIn: '1h' } // El token expira en 1 hora
        );

            // Configurar la cookie con el token
            res.cookie('authToken', token, {
                httpOnly: true,          // No accesible desde JavaScript en el navegador
                secure: true,             // Solo se envía en conexiones HTTPS
                sameSite: 'None',       // Solo se envía en solicitudes del mismo sitio
                maxAge: 60 * 60 * 1000    // Expira en 1 hora
            });


        // Enviar el token como respuesta
        res.json({ message: 'Inicio de sesión exitoso', token, tipoUsuario: usuario.tipoUsuario });
    } catch (error) {
        console.error("Error en el inicio de sesión:", error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
});

module.exports = router;
