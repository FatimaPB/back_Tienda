const mongoose = require("mongoose");
const bcryptjs = require('bcryptjs');

const UsuarioSchema = new mongoose.Schema({
    nombre: {
        type: String,
        require: true 
    },
    correo: {
        type: String,
        require: true
    },
    contrasena: {
        type: String,
        require: true
    },
    telefono: {
        type: String,
        require: true
    },
    tipoUsuario: {
        type: String,
        default: 'Cliente'
    },
    isVerified: {
        type: Boolean,
        default: false
    }, //propiedad para verificar el correo
    verificationCode: {
        type: String, // Cambiar a String
        required: true,
    },
    failedAttempts: {
        type: Number,
        default: 0 // Inicializa el contador de intentos fallidos
    },
    isBlocked: {
        type: Boolean,
        default: false // Inicializa el estado de bloqueo
    },
    blockedUntil: { 
        type: Date,
        default: null 
    } ,

    contrasenasAnteriores: [{ type: String }], // Array para contraseñas anteriores
});


// Método para comprobar si una contraseña ya fue usada
usuarioSchema.methods.esContrasenaValida = async function (nuevaContrasena) {
    // Comparar nueva contraseña con las contraseñas almacenadas
    for (const contrasenaHash of this.contrasenasAnteriores) {
      const coincide = await bcrypt.compare(nuevaContrasena, contrasenaHash);
      if (coincide) {
        return false; // La contraseña ya fue usada
      }
    }
    return true; // La contraseña es válida
  };
  
  // Método para actualizar la contraseña
  usuarioSchema.methods.cambiarContrasena = async function (nuevaContrasena) {
    const contrasenaValida = await this.esContrasenaValida(nuevaContrasena);
    if (!contrasenaValida) {
      throw new Error('La nueva contraseña no puede ser igual a una anterior.');
    }
  
    // Hacer el hash de la nueva contraseña
    const nuevaContrasenaHash = await bcryptjs.hash(nuevaContrasena, 10);
    this.contrasena = nuevaContrasenaHash;
  
    // Almacenar la nueva contraseña en el array de contraseñas anteriores
    this.contrasenasAnteriores.push(nuevaContrasenaHash);
  
    // Limitar el número de contraseñas anteriores (por ejemplo, 5)
    if (this.contrasenasAnteriores.length > 5) {
      this.contrasenasAnteriores.shift(); // Eliminar la más antigua
    }
  
    await this.save(); // Guardar los cambios
  };
  

module.exports = mongoose.model('Usuario', UsuarioSchema);
