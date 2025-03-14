const mysql = require('mysql2');

const pool = mysql.createPool({
  host: '191.96.56.103',
  user: 'u988046079_cristo',
  password: 'ZAYpardo1997$',
  database: 'u988046079_Libreria',
  port: 3306,
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
