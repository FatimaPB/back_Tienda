const mysql = require('mysql2');

const pool = mysql.createPool({
  host: process.env.DB_HOST || '191.96.56.103',
  user: process.env.DB_USER || 'u988046079_cristo',
  password: process.env.DB_PASSWORD || 'ZAYpardo1997$',
  database: process.env.DB_NAME || 'u988046079_Libreria',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Error conectando a MySQL:', err);
  } else {
    console.log('✅ Conexión exitosa a MySQL db libreia cristo rey ✅  ');
    connection.release();
  }
});

module.exports = pool;
