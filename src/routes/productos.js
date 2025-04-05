// routes/productos.js
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const Producto = require("../models/Producto");
const jwt = require('jsonwebtoken');
const JWT_SECRET = 'tu_clave_secreta'; // Guarda esto en un archivo de entorno

const multer = require("multer");
const streamifier = require("streamifier");
const cloudinary = require('../config/cloudinaryConfig');

// Configurar Multer para almacenamiento en memoria
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

/**
 * Endpoint para crear un producto junto con sus imágenes.
 * Se espera que el cliente envíe:
 * - En el body (JSON): Los datos del producto.
 * - En el campo 'images' (multipart/form-data): Los archivos de imagen.
 * 
 * 
 */

router.get('/productos/buscar', (req, res) => {
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Se requiere un término de búsqueda' });
  }

  const query = `
    SELECT p.*, c.nombre_categoria
    FROM productos p
    LEFT JOIN categorias c ON p.categoria_id = c.id
    WHERE p.nombre LIKE ? OR p.descripcion LIKE ?
    ORDER BY p.nombre ASC
  `;
  const valores = [`%${q}%`, `%${q}%`];

  db.query(query, valores, (error, resultados) => {
    if (error) {
      console.error('Error en la búsqueda de productos:', error);
      return res.status(500).json({ error: 'Error al buscar productos' });
    }
    res.json(resultados);
  });
});






// Middleware para verificar el token JWT
function verifyToken(req, res, next) {
  const token = req.cookies.authToken; // Obtener el token de la cookie

  if (!token) {
      return res.status(401).json({ message: 'Token no proporcionado' });
  }

  try {
    // Decodifica el token y extrae el ID del usuario
    const decoded = jwt.verify(token, JWT_SECRET);
    req.id = decoded.id; // Verifica que "id" exista en el token
    next();
  } catch (error) {
    console.error('Error al verificar el token:', error); // Ver detalle del error
    res.status(401).json({ message: 'Token inválido o expirado.' });
  }
}
// Endpoint para crear un producto con imágenes (ahora protegido por el middleware)
// Endpoint para crear un producto con variantes e imágenes
router.post("/productos", verifyToken, upload.array("images"), async (req, res) => {
  try {
    // Extraer datos del producto del body
    const {
      nombre,
      descripcion,
      sku,
      costo,
      porcentaje_ganancia,
      precio_calculado,
      calificacion_promedio,
      total_resenas,
      categoria_id,
      variantes // Variantes es un array de objetos { color_id, tamano_id, cantidad_stock }
    } = req.body;

        // Convertir variantes a objeto si es string
        let variantesArray = [];
        if (variantes) {
          if (typeof variantes === "string") {
            variantesArray = JSON.parse(variantes);
          } else {
            variantesArray = variantes;
          }
        }

    // Usar el ID del usuario extraído del token
    const usuario_id = req.id;

    // Insertar el producto en la tabla productos
    const productoId = await new Promise((resolve, reject) => {
      const query = `
        INSERT INTO productos 
          (nombre, descripcion, sku, costo, porcentaje_ganancia, precio_calculado, calificacion_promedio, total_resenas, categoria_id, usuario_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      db.query(
        query,
        [
          nombre,
          descripcion,
          sku,
          costo,
          porcentaje_ganancia,
          precio_calculado,
          calificacion_promedio,
          total_resenas,
          categoria_id,
          usuario_id,
        ],
        (err, result) => {
          if (err) return reject(err);
          resolve(result.insertId);
        }
      );
    });

    // Crear las variantes para el producto
    if (variantesArray && variantesArray.length > 0) {
      for (const variante of variantesArray) {
        const { color_id, tamano_id, cantidad_stock } = variante;
        // Verificar que los valores no sean null o undefined
        if (color_id != null && tamano_id != null && cantidad_stock != null) {
          await new Promise((resolve, reject) => {
            const query = `
              INSERT INTO variantes (producto_id, color_id, tamano_id, cantidad_stock)
              VALUES (?, ?, ?, ?)
            `;
            db.query(
              query,
              [productoId, color_id, tamano_id, cantidad_stock],
              (err, result) => {
                if (err) return reject(err);
                resolve(result);
              }
            );
          });
        } else {
          return res.status(400).json({
            message: "Faltan datos para alguna variante: color_id, tamano_id o cantidad_stock"
          });
        }
      }
    }

    // Procesar imágenes si se enviaron archivos
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const uploadResult = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "productos" },
            (error, result) => {
              if (error) return reject(error);
              resolve(result);
            }
          );
          streamifier.createReadStream(file.buffer).pipe(stream);
        });

        await new Promise((resolve, reject) => {
          const query = "INSERT INTO imagenes (producto_id, url) VALUES (?, ?)";
          db.query(query, [productoId, uploadResult.secure_url], (err, result) => {
            if (err) return reject(err);
            resolve(result);
          });
        });
      }
    }

    res.status(201).json({ message: "Producto, variantes e imágenes creados exitosamente", productoId });
  } catch (error) {
    console.error("Error al crear producto, variantes e imágenes:", error);
    res.status(500).json({ message: "Error al crear producto" });
  }
});


// Endpoint para editar un producto
router.put("/productos/:id", verifyToken, upload.array("images"), async (req, res) => {
  try {
    const { id } = req.params; // ID del producto a editar
    const {
      nombre,
      descripcion,
      sku,
      costo,
      porcentaje_ganancia,
      precio_calculado,
      cantidad_stock,
      categoria_id,
      color_id,
      tamano_id,
    } = req.body;

    // Verificar si el producto existe
    const producto = await new Promise((resolve, reject) => {
      const query = "SELECT * FROM productos WHERE id = ?";
      db.query(query, [id], (err, result) => {
        if (err) return reject(err);
        if (result.length === 0) return reject(new Error("Producto no encontrado"));
        resolve(result[0]);
      });
    });

    // Actualizar producto
    await new Promise((resolve, reject) => {
      const query = `
        UPDATE productos 
        SET nombre = ?, descripcion = ?, sku = ?, costo = ?, porcentaje_ganancia = ?, precio_calculado = ?, cantidad_stock = ?, categoria_id = ? , color_id = ?, tamano_id = ?
        WHERE id = ?
      `;
      db.query(
        query,
        [nombre, descripcion, sku, costo, porcentaje_ganancia, precio_calculado, cantidad_stock, categoria_id, color_id, tamano_id, id],
        (err, result) => {
          if (err) return reject(err);
          resolve(result);
        }
      );
    });

    // Si se enviaron nuevas imágenes, eliminar las actuales y agregar las nuevas
    if (req.files && req.files.length > 0) {
      // Eliminar imágenes actuales de la base de datos
      await new Promise((resolve, reject) => {
        const query = "DELETE FROM imagenes WHERE producto_id = ?";
        db.query(query, [id], (err, result) => {
          if (err) return reject(err);
          resolve(result);
        });
      });

      // Opcional: Si guardas el public_id de las imágenes en Cloudinary, recórrelo y elimina cada imagen de Cloudinary
      // Ejemplo (suponiendo que tienes almacenado public_id en lugar de solo la URL):
      // const imagenesAnteriores = await getImagenesFromDB(id);
      // for (const img of imagenesAnteriores) {
      //   await cloudinary.uploader.destroy(img.public_id);
      // }

      // Procesar y subir las nuevas imágenes
      for (const file of req.files) {
        const uploadResult = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "productos" },
            (error, result) => {
              if (error) return reject(error);
              resolve(result);
            }
          );
          streamifier.createReadStream(file.buffer).pipe(stream);
        });

        // Insertar la nueva imagen en la base de datos
        await new Promise((resolve, reject) => {
          const query = "INSERT INTO imagenes (producto_id, url) VALUES (?, ?)";
          db.query(query, [id, uploadResult.secure_url], (err, result) => {
            if (err) return reject(err);
            resolve(result);
          });
        });
      }
    }

    res.status(200).json({ message: "Producto actualizado exitosamente" });
  } catch (error) {
    console.error("Error al editar producto:", error);
    res.status(500).json({ message: "Error al editar producto" });
  }
});


// Endpoint para eliminar un producto
router.delete("/productos/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params; // ID del producto a eliminar

    // Verificar si el producto existe
    const producto = await new Promise((resolve, reject) => {
      const query = "SELECT * FROM productos WHERE id = ?";
      db.query(query, [id], (err, result) => {
        if (err) return reject(err);
        if (result.length === 0) return reject(new Error("Producto no encontrado"));
        resolve(result[0]);
      });
    });

    // Eliminar registros en otras tablas (productos_carrito, etc.)
    await new Promise((resolve, reject) => {
      const query = "DELETE FROM productos_carrito WHERE producto_id = ?";
      db.query(query, [id], (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });

    // Eliminar imágenes asociadas al producto
    await new Promise((resolve, reject) => {
      const query = "DELETE FROM imagenes WHERE producto_id = ?";
      db.query(query, [id], (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });

    // Eliminar el producto
    await new Promise((resolve, reject) => {
      const query = "DELETE FROM productos WHERE id = ?";
      db.query(query, [id], (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });

    res.status(200).json({ message: "Producto eliminado exitosamente" });
  } catch (error) {
    console.error("Error al eliminar producto:", error);
    res.status(500).json({ message: "Error al eliminar producto" });
  }
});


// Endpoint para obtener todos los productos con imágenes y variantes
router.get("/productos", verifyToken, async (req, res) => {
  try {
    const query = `
      SELECT p.*, 
             c.nombre_categoria AS nombre_categoria,
             co.nombre_color AS nombre_color,
             t.nombre_tamano AS nombre_tamano, 
             u.nombre AS usuario_nombre
      FROM productos p
      JOIN categorias c ON p.categoria_id = c.id
      JOIN colores co ON p.color_id = co.id
      JOIN tamaños t ON p.tamano_id = t.id
      JOIN usuarios u ON p.usuario_id = u.id
    `;

    db.query(query, async (err, productos) => {
      if (err) {
        console.error('Error al obtener productos:', err);
        return res.status(500).json({ message: 'Error al obtener productos' });
      }

      // Para cada producto, obtener las imágenes y variantes asociadas
      const productosConDatos = await Promise.all(productos.map(async (producto) => {
        return new Promise((resolve, reject) => {
          // Primero obtenemos las imágenes
          const queryImagenes = "SELECT url FROM imagenes WHERE producto_id = ?";
          db.query(queryImagenes, [producto.id], (err, imagenes) => {
            if (err) {
              console.error("Error al obtener imágenes:", err);
              return reject(err);
            }
            producto.imagenes = imagenes.map(img => img.url);
            // Luego, obtenemos las variantes
            const queryVariantes = "SELECT * FROM variantes WHERE producto_id = ?";
            db.query(queryVariantes, [producto.id], (err, variantes) => {
              if (err) {
                console.error("Error al obtener variantes:", err);
                return reject(err);
              }
              producto.variantes = variantes;
              resolve(producto);
            });
          });
        });
      }));

      res.json(productosConDatos);
    });
  } catch (error) {
    console.error("Error al obtener productos:", error);
    res.status(500).json({ message: 'Error al obtener productos' });
  }
});



router.get("/variantes", async (req, res) => {
  try {
    const { nombre, color_id } = req.query;

    // Construcción dinámica de la consulta SQL
    let query = `
      SELECT DISTINCT p.color_id, c.nombre_color, p.tamano_id, t.nombre_tamano 
      FROM productos p
      JOIN colores c ON p.color_id = c.id
      JOIN tamaños t ON p.tamano_id = t.id
      WHERE p.nombre = ?`;

    // Si se pasa color_id, agregar filtro adicional
    const queryParams = [nombre];

    if (color_id) {
      query += ` AND p.color_id = ?`;
      queryParams.push(color_id);
    }

    db.query(query, queryParams, (err, results) => {
      if (err) {
        console.error("Error al obtener variantes del producto:", err);
        return res.status(500).json({ message: "Error en el servidor" });
      }

      if (results.length === 0) {
        return res.status(404).json({ message: "No se encontraron variantes para este producto" });
      }

      res.json(results);
    });
  } catch (error) {
    console.error("Error en la consulta:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
});



  // Ruta para obtener todos los productos con sus imágenes
router.get("/productos-publico", async (req, res) => {
    try {
      // Obtener los productos con sus categorías y usuarios
      const query = `
        SELECT p.*, c.nombre_categoria AS nombre_categoria, u.nombre AS usuario_nombre
        FROM productos p
        JOIN categorias c ON p.categoria_id = c.id
        JOIN usuarios u ON p.usuario_id = u.id
      `;
      db.query(query, (err, productos) => {
        if (err) {
          console.error("Error al obtener productos:", err);
          return res.status(500).json({ message: "Error al obtener productos" });
        }
  
        // Obtener las imágenes de cada producto
        const productosConImagenes = [];
        productos.forEach((producto, index) => {
          const queryImagenes = "SELECT * FROM imagenes WHERE producto_id = ?";
          db.query(queryImagenes, [producto.id], (err, imagenes) => {
            if (err) {
              console.error("Error al obtener imágenes:", err);
              return res.status(500).json({ message: "Error al obtener imágenes" });
            }
  
            productos[index].imagenes = imagenes.map(imagen => imagen.url);
  
            // Si ya hemos procesado todos los productos, los enviamos
            if (productos.every(p => p.imagenes !== undefined)) {
              return res.json(productos);
            }
          });
        });
      });
    } catch (error) {
      console.error("Error al obtener productos:", error);
      res.status(500).json({ message: "Error al obtener productos" });
    }
  });

  // Ruta para obtener un producto por ID
router.get("/productos/:id", async (req, res) => {
  const { id } = req.params;  // Obtener el ID del producto desde la URL

  try {
    // Consulta para obtener el producto con sus detalles, categoría y usuario
    const queryProducto = `
      SELECT p.*, c.nombre_categoria AS nombre_categoria, u.nombre AS usuario_nombre
      FROM productos p
      JOIN categorias c ON p.categoria_id = c.id
      JOIN usuarios u ON p.usuario_id = u.id
      WHERE p.id = ?
    `;
    
    // Ejecutar la consulta para obtener los detalles del producto
    db.query(queryProducto, [id], (err, producto) => {
      if (err) {
        console.error("Error al obtener el producto:", err);
        return res.status(500).json({ message: "Error al obtener el producto" });
      }

      if (producto.length === 0) {
        return res.status(404).json({ message: "Producto no encontrado" });
      }

      // Obtener las imágenes del producto
      const queryImagenes = "SELECT * FROM imagenes WHERE producto_id = ?";
      db.query(queryImagenes, [id], (err, imagenes) => {
        if (err) {
          console.error("Error al obtener las imágenes:", err);
          return res.status(500).json({ message: "Error al obtener las imágenes" });
        }

        // Agregar las imágenes al objeto del producto
        producto[0].imagenes = imagenes.map(imagen => imagen.url);
        res.status(200).json(producto[0]);
      });
    });
  } catch (error) {
    console.error("Error al obtener el producto:", error);
    res.status(500).json({ message: "Error al obtener el producto" });
  }
});

  
  // Ruta para agregar producto al catálogo
router.post('/catalogo', async (req, res) => {
  const { producto_id } = req.body;

  if (!producto_id) {
      return res.status(400).json({ message: "El ID del producto es requerido" });
  }

  try {
      // Insertar el producto en la tabla catalogo
      db.query('INSERT INTO catalogo_productos (producto_id) VALUES (?)', [producto_id]);
      res.status(201).json({ message: "Producto agregado al catálogo exitosamente" });
  } catch (error) {
      res.status(500).json({ message: "Error al agregar el producto al catálogo", error });
  }
});
  
// Ruta para obtener los productos del catálogo
router.get('/catalogo', async (req, res) => {
  try {
    // Consulta para obtener los productos del catálogo
    const query = `
      SELECT p.id, p.nombre, p.descripcion, p.precio_calculado
      FROM catalogo_productos cp
      INNER JOIN productos p ON cp.producto_id = p.id;
    `;
    const [productos] = await db.promise().query(query);

    if (productos.length === 0) {
      return res.status(404).json({ message: "No hay productos en el catálogo" });
    }

    // Para cada producto, obtener las imágenes
    const productosConImagenes = await Promise.all(productos.map(async (producto) => {
      return new Promise((resolve, reject) => {
        const queryImagenes = "SELECT url FROM imagenes WHERE producto_id = ?";
        db.query(queryImagenes, [producto.id], (err, imagenes) => {
          if (err) {
            console.error("Error al obtener imágenes:", err);
            return reject(err);
          }
          producto.imagenes = imagenes.map(img => img.url); // Guardar solo las URLs
          resolve(producto);
        });
      });
    }));

    // Devolver los productos con imágenes
    res.status(200).json({ productos: productosConImagenes });
  } catch (error) {
    res.status(500).json({ message: "Error al obtener los productos del catálogo", error });
  }
});


// Ruta para eliminar producto del catálogo
router.delete('/catalogo/:producto_id', async (req, res) => {
  const { producto_id } = req.params;

  if (!producto_id) {
    return res.status(400).json({ message: "El ID del producto es requerido" });
  }

  try {
    // Eliminar el producto del catálogo en la tabla catalogo_productos
    const result = await db.promise().query('DELETE FROM catalogo_productos WHERE producto_id = ?', [producto_id]);

    if (result[0].affectedRows === 0) {
      return res.status(404).json({ message: "Producto no encontrado en el catálogo" });
    }

    res.status(200).json({ message: "Producto eliminado del catálogo exitosamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar el producto del catálogo", error });
  }
});



// Endpoint para obtener productos por categoría
router.get('/catalogo/categoria/:categoriaId', (req, res) => {
  const categoriaId = req.params.categoriaId;

  // Consulta a la base de datos para obtener productos por categoría
  const query = `
    SELECT * FROM productos
    WHERE categoria_id = ? AND id IN (SELECT producto_id FROM catalogo_productos)
  `;

  db.query(query, [categoriaId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Error al obtener productos' });
    }
    res.json(results);
  });
});

// Endpoint para obtener productos con imágenes asociadas
router.get('/productos/categoria/nombre/:nombreCategoria', (req, res) => {
  const nombreCategoria = req.params.nombreCategoria;
  
  // Consulta para obtener productos y sus imágenes asociadas
  db.query(`
    SELECT p.*, i.url AS imagen_url 
    FROM productos p
    LEFT JOIN imagenes i ON p.id = i.producto_id
    WHERE p.categoria_id = (SELECT id FROM categorias WHERE nombre_categoria = ?)
    AND p.id IN (SELECT producto_id FROM catalogo_productos)`, [nombreCategoria], (err, results) => {
    
    if (err) {
      return res.status(500).json({ message: 'Error al obtener productos' });
    }
    
    // Agrupar las imágenes por producto
    const productosConImagenes = results.reduce((acc, producto) => {
      const productoExistente = acc.find(p => p.id === producto.id);
      
      if (productoExistente) {
        productoExistente.imagenes.push(producto.imagen_url);
      } else {
        acc.push({
          ...producto,
          imagenes: producto.imagen_url ? [producto.imagen_url] : []
        });
      }
      
      return acc;
    }, []);
    
    res.json(productosConImagenes);
  });
});






  module.exports = router;
