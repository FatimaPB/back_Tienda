const express = require("express");
const bcryptjs = require('bcryptjs');
const transporter = require('../config/nodemailer');
const UsuarioSchema = require("../models/usuarios");
const { manejarIntentosFallidos, obtenerUsuariosBloqueados, bloquearUsuario } = require("../controllers/usuarioController");
const crypto = require('crypto'); // Para generar el código de verificación
const jwt = require('jsonwebtoken');
const Actividad = require('../models/actividad.model');
const router = express.Router();

const JWT_SECRET = 'tu_clave_secreta'; // Guarda esto en un archivo de entorno


// Middleware para verificar el token desde cookies o desde el encabezado
const verifyToken = (req, res, next) => {
  // Intenta obtener el token desde las cookies
  let token = req.cookies.authToken;

  // Si no se encuentra el token en las cookies, intenta obtenerlo del encabezado
  if (!token) {
    token = req.header('Authorization')?.replace('Bearer ', '');
  }

  // Si no se encuentra el token en ninguno de los dos lugares, retorna un error
  if (!token) {
    return res.status(401).json({ message: 'Acceso denegado. No se proporcionó el token.' });
  }

  try {
    // Decodifica el token y extrae el ID del usuario
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id; // Verifica que "id" exista en el token
    next();
  } catch (error) {
    console.error('Error al verificar el token:', error); // Ver detalle del error
    res.status(401).json({ message: 'Token inválido o expirado.' });
  }
};

  
  

// Ruta para obtener el perfil del usuario
router.get('/perfil', verifyToken, async (req, res) => {
  try {
    // Usamos el id del usuario del token para buscar en la base de datos
    const usuario = await UsuarioSchema.findById(req.userId);

    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    // Excluir la contraseña y otros datos sensibles
    const { contrasena, ...perfil } = usuario.toObject();
    res.json(perfil); // Devolver los datos del perfil
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el perfil del usuario' });
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
          from: '"LibreriaCR" <' + process.env.EMAIL_USER + '>',
          to: correo,
          subject: 'Verificación de tu cuenta',
          html: `
              <div style="font-family: Arial, sans-serif; color: #333; padding: 20px; background-color: #f4f4f9; border-radius: 8px; max-width: 600px; margin: auto;">
                  <h2 style="color: #4a90e2; text-align: center;">Verificación de tu cuenta</h2>
                  <p style="font-size: 16px; line-height: 1.6;">
                      ¡Hola!<br><br>
                      Gracias por registrarte en nuestra plataforma. Para completar tu registro, por favor verifica tu dirección de correo electrónico.
                  </p>
                  <div style="text-align: center; margin: 20px 0;">
                      <p style="font-size: 18px; font-weight: bold;">Tu código de verificación es:</p>
                      <p style="font-size: 24px; font-weight: bold; color: #4a90e2; background-color: #e6f0fb; padding: 10px 20px; border-radius: 8px; display: inline-block;">
                          ${verificationCode}
                      </p>
                  </div>
                  <p style="font-size: 16px; line-height: 1.6;">
                      Este código es válido solo durante los próximos 10 minutos. Ingresa este código en la plataforma para activar tu cuenta.
                  </p>
                  <p style="font-size: 16px; line-height: 1.6; color: #999;">
                      Si no solicitaste esta verificación, ignora este mensaje.
                  </p>
                  <p style="font-size: 16px; line-height: 1.6;">
                      ¡Gracias!<br>
                      <strong>El equipo de soporte de LibreriaCR</strong>
                  </p>
              </div>
          `
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


// Ruta para actualizar el perfil del usuario
router.put('/edit', verifyToken, async (req, res) => {
    try {
      // Obtener el id del usuario desde el token
      const usuarioId = req.userId;
      const { nombre, correo, telefono } = req.body; // Datos enviados por el cliente
  
      // Actualizar los datos del usuario en la base de datos
      const usuario = await UsuarioSchema.findByIdAndUpdate(
        usuarioId,
        { nombre, correo, telefono },
        { new: true } // Devuelve el documento actualizado
      );
  
      if (!usuario) {
        return res.status(404).json({ message: 'Usuario no encontrado.' });
      }
  
      // Excluir la contraseña y otros datos sensibles
      const { contrasena, ...perfil } = usuario.toObject();
      res.json(perfil); // Devolver los datos actualizados
    } catch (error) {
      res.status(500).json({ message: 'Error al actualizar el perfil del usuario' });
    }
  });


  // Función para registrar la actividad
async function registrarActividad(usuarioId, tipo, ip, detalles = '') {
  try {
      // Registrar la actividad en la base de datos
      const actividad = new Actividad({
          usuarioId,
          tipo,
          ip,
          detalles,
      });

      // Guardar la actividad
      await actividad.save();
      console.log(`Actividad registrada: ${tipo}`);
  } catch (error) {
      console.error('Error al registrar la actividad:', error);
  }
}


// Ruta para cambiar la contraseña
router.put('/cambiar-contrasena', verifyToken, async (req, res) => {
    try {
      const userId = req.userId;  // Obtener el ID del usuario desde el token
      const { currentPassword, newPassword } = req.body; // Recibir las contraseñas actuales y nuevas del cuerpo de la solicitud
  
      // Buscar al usuario por su ID
      const user = await UsuarioSchema.findById(userId);
      
      // Verificar si el usuario existe y si la contraseña actual es correcta
      if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }
  
      const isMatch = await bcryptjs.compare(currentPassword, user.contrasena);
      if (!isMatch) {
        return res.status(400).json({ message: 'Contraseña actual incorrecta' });
      }
  
      // Verificar que la nueva contraseña no sea igual a la actual
      if (currentPassword === newPassword) {
        return res.status(400).json({ message: 'La nueva contraseña no puede ser la misma que la actual' });
      }
  
      // Actualizar la contraseña
      user.contrasena = await bcryptjs.hash(newPassword, 10);
      await user.save();

      const ip = req.ip;
      await registrarActividad(usuario._id, 'Cambio de contraseña', ip, 'Cambio de contraseña exitoso');
  
      // Responder con éxito
      res.json({ message: 'Contraseña actualizada con éxito' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error al cambiar la contraseña' });
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

// Ruta para guardar la configuración de intentos límites
router.post('/configurar-intentos', async (req, res) => {
    const { userId, intentosLimite } = req.body;

    try {
        // Busca el usuario en la base de datos
        const usuario = await Usuario.findById(userId);
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


// Ruta para obtener todas las actividades sin hacer populate
router.get('/actividad', async (req, res) => {
  try {
      // Obtener todas las actividades de la base de datos sin el populate
      const actividades = await Actividad.find();  // Solo recuperamos los datos de la colección 'Actividad'

      if (actividades.length === 0) {
          return res.status(404).json({ message: 'No se encontraron actividades.' });
      }

      // Devolver las actividades
      res.json({ actividades });
  } catch (error) {
      console.error('Error al obtener las actividades:', error);
      res.status(500).json({ message: 'Error al obtener las actividades.' });
  }
});

// Ruta para manejar intentos fallidos
router.post('/bloquear-por-intentos', manejarIntentosFallidos);

// Ruta para obtener usuarios bloqueados
router.get('/usuarios-bloqueados', obtenerUsuariosBloqueados);

// Ruta para bloquear un usuario
router.put('/usuarios/bloquear/:userId', bloquearUsuario); // Cambia según tu estructura de rutas


module.exports = router;
