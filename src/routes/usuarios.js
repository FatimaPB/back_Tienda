require('dotenv').config();
const express = require("express");
const bcryptjs = require('bcryptjs');
const nodemailer = require("nodemailer");
const UsuarioSchema = require("../models/usuarios");
const crypto = require('crypto'); // Para generar el código de verificación
const router = express.Router();

// Configura tu transporte de correo
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Crear usuario
router.post("/usuarios", async (req, res) => {
    try {
        const { nombre, correo, contrasena, telefono } = req.body;

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
        const isCodeValid = await crypto.compare(codigoVerificacion, usuario.verificationCode);

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
        const usuarios = await USuarioSchema.find();
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
        const result = await USuarioSchema.updateOne({ _id: id }, { $set: updatedUsuario });
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error updating client', error });
    }
});

// Eliminar
router.delete("/usuarios/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const data = await USuarioSchema.deleteOne({ _id: id });
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
