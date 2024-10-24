// controllers/authController.js
const bcryptjs = require('bcryptjs');
const Usuario = require('../models/usuarios');
const transporter = require('../config/nodemailer');

// Almacenar temporalmente los códigos de verificación
let verificationCodes = {}; // { correo: { codigo: '123456', fecha: Date } }

exports.recuperarContrasena = async (req, res) => {
    const { correo } = req.body;
    try {
        const usuario = await Usuario.findOne({ correo });
        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const codigo = Math.floor(100000 + Math.random() * 900000).toString();
        verificationCodes[correo] = { codigo, fecha: new Date() };

        const mailOptions = {
            to: correo,
            subject: 'Código de verificación para recuperación de contraseña',
            text: `Tu código de verificación es: ${codigo}. Este código es válido por 10 minutos.`,
        };

        await transporter.sendMail(mailOptions);
        res.json({ message: 'Se ha enviado un código de verificación a tu correo' });
    } catch (error) {
        console.error("Error al enviar el correo de recuperación:", error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

exports.verificarCodigo = (req, res) => {
    const { correo, codigo } = req.body;

    if (verificationCodes[correo] && verificationCodes[correo].codigo === codigo) {
        const tiempoExpiracion = 10 * 60 * 1000; // 10 minutos
        const tiempoDesdeGeneracion = new Date() - verificationCodes[correo].fecha;

        if (tiempoDesdeGeneracion < tiempoExpiracion) {
            return res.json({ message: 'Código verificado con éxito. Puedes restablecer tu contraseña.' });
        } else {
            delete verificationCodes[correo]; // Eliminar el código si ha expirado
            return res.status(400).json({ message: 'El código ha expirado. Solicita uno nuevo.' });
        }
    }

    return res.status(400).json({ message: 'Código de verificación incorrecto' });
};

exports.restablecerContrasena = async (req, res) => {
    const { correo, nuevaContrasena } = req.body;

    try {
        const usuario = await Usuario.findOne({ correo });
        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        usuario.contrasena = await bcryptjs.hash(nuevaContrasena, 10);
        await usuario.save();

        delete verificationCodes[correo];

        res.json({ message: 'Contraseña restablecida exitosamente' });
    } catch (error) {
        console.error("Error al restablecer la contraseña:", error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};
