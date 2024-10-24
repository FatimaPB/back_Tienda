const express = require("express");
const bcryptjs = require('bcryptjs');
const transporter = require('../config/nodemailer');
const UsuarioSchema = require("../models/usuarios");
const { manejarIntentosFallidos, obtenerUsuariosBloqueados, bloquearUsuario } = require("../controllers/usuarioController");
const crypto = require('crypto'); // Para generar el código de verificación
const https = require('https'); // Para la verificación de reCAPTCHA
const router = express.Router();

const RECAPTCHA_SECRET_KEY = '6LfFw2oqAAAAAAid0riCbeTO37QJc15EUILDuxo4'; // Reemplaza por tu clave secreta de reCAPTCHA

// Crear usuario
router.post("/usuarios", async (req, res) => {
    try {
        const { nombre, correo, contrasena, telefono, recaptchaToken } = req.body;

        // Verificar si se ha recibido el token de reCAPTCHA
        if (!recaptchaToken) {
            return res.status(400).json({ message: "Por favor completa el reCAPTCHA." });
        }

        // Verificar el token de reCAPTCHA con Google
        const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}`;
        
        // Hacer la solicitud HTTPS a la API de reCAPTCHA
        https.get(verificationUrl, (recaptchaRes) => {
            let data = '';

            recaptchaRes.on('data', (chunk) => {
                data += chunk;
            });

            recaptchaRes.on('end', async () => {
                const recaptchaResponse = JSON.parse(data);

                // Verificar si la respuesta fue exitosa
                if (!recaptchaResponse.success) {
                    return res.status(400).json({ message: "Verificación de reCAPTCHA fallida." });
                }

                // Verificar si el correo ya está registrado
                const usuarioExistente = await UsuarioSchema.findOne({ correo });
                if (usuarioExistente) {
                    return res.status(400).json({ message: "El correo ya está registrado" });
                }

                // Hashear la contraseña
                const hashedPassword = await bcryptjs.hash(contrasena, 10);

                // Generar un código de verificación
                const verificationCode = crypto.randomInt(100000, 999999).toString(); // Código de 6 dígitos

                // Hashear el código de verificación
                const hashedVerificationCode = await bcryptjs.hash(verificationCode, 10);

                // Crear el nuevo usuario sin verificar
                const usuario = new UsuarioSchema({
                    nombre,
                    correo,
                    contrasena: hashedPassword,
                    telefono,
                    tipoUsuario: 'Cliente',
                    verificationCode: hashedVerificationCode,  // Guardar el código de verificación
                    isVerified: false
                });

                // Guardar el usuario
                await usuario.save();

                // Enviar correo con el código de verificación
                const mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: correo,
                    subject: 'Verificación de correo electrónico',
                    text: `Tu código de verificación es: ${verificationCode}`
                };

                // Envía el correo
                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        console.error("Error al enviar el correo:", error);
                        return res.status(500).json({ message: "Error al enviar el correo de verificación", error: error.message });
                    }
                    console.log("Correo enviado:", info.response);
                    res.status(201).json({ message: "Usuario creado. Por favor verifica tu correo electrónico." });
                });
            });
        }).on('error', (error) => {
            console.error("Error al verificar reCAPTCHA:", error);
            res.status(500).json({ message: "Error interno al verificar reCAPTCHA" });
        });

    } catch (error) {
        console.error("Error al registrar usuario:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
});

// Endpoint para verificar el código de verificación
router.post("/usuarios/verico", async (req, res) => {
    const { correo, codigoVerificacion } = req.body;

    try {
        // Buscar al usuario por correo
        const usuario = await UsuarioSchema.findOne({ correo });

        if (!usuario) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

        // Verificar si ya está verificado
        if (usuario.isVerified) {
            return res.status(400).json({ message: "El usuario ya está verificado" });
        }

        // Comparar el código ingresado con el código hasheado almacenado
        const isCodeValid = await bcryptjs.compare(codigoVerificacion, usuario.verificationCode);

        if (isCodeValid) {
            // Marcar al usuario como verificado
            usuario.isVerified = true;
            await usuario.save();

            return res.status(200).json({ message: "Correo verificado con éxito" });
        } else {
            return res.status(400).json({ message: "Código de verificación incorrecto" });
        }

    } catch (error) {
        console.error("Error al verificar el código:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
});

// Obtener
router.get("/usuarios", async (req, res) => {
    try {
        const usuarios = await UsuarioSchema.find();
        res.json(usuarios);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Editar
router.put('/usuarios/:id', async (req, res) => {
    const { id } = req.params;
    const updatedUsuario = req.body;

    try {
        const result = await UsuarioSchema.updateOne({ _id: id }, { $set: updatedUsuario });
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error updating client', error });
    }
});

// Eliminar
router.delete("/usuarios/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const data = await UsuarioSchema.deleteOne({ _id: id });
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Ruta para guardar la configuración de intentos límites
router.post('/configurar-intentos', async (req, res) => {
    const { userId, intentosLimite } = req.body;

    try {
        // Busca el usuario en la base de datos
        const usuario = await UsuarioSchema.findById(userId);
        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Actualiza el número de intentos límite
        usuario.intentosLimite = intentosLimite;
        await usuario.save();

        res.status(200).json({ message: 'Configuración guardada con éxito' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al guardar la configuración' });
    }
});

// Ruta para manejar intentos fallidos
router.post('/bloquear-por-intentos', manejarIntentosFallidos);

// Ruta para obtener usuarios bloqueados
router.get('/usuarios-bloqueados', obtenerUsuariosBloqueados);

// Ruta para bloquear un usuario
router.put('/usuarios/bloquear/:userId', bloquearUsuario); // Cambia según tu estructura de rutas

module.exports = router;
